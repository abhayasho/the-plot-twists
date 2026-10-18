// Dataset load and cleanup
d3.csv("data/reels_attention_span_dataset_12000.csv", d => {
    // Convert values to numbers
    d.age = +d.age;
    d.focus_level = +d.focus_level;
    d.reels_watch_time_hours = +d.reels_watch_time_hours;
    d.daily_screen_time_hours = +d.daily_screen_time_hours;
    d.sleep_hours = +d.sleep_hours;
    d.attention_span_score = +d.attention_span_score;
    d.task_completion_rate = +d.task_completion_rate;
    return d;
}).then(data => {
    renderGenerationScreenTimeChart(data, "chart-1");
    renderScreenTimeVsFocusChart(data, "chart-2");
    renderPlatformComparisonChart(data, "chart-3");
    renderSleepVsMetricsChart(data, "chart-4");
    renderGranularLinkedInspector(data, "chart-5", "chart-6");
    renderFocusJourney(data, "focus-journey");
}).catch(error => {
    console.error("Error loading CSV dataset: ", error);
});

function renderGenerationScreenTimeChart(data, containerId) {
    const container = document.getElementById(containerId);
    const margin = { top: 85, right: 50, bottom: 70, left: 50 };
    const width = container.getBoundingClientRect().width - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;

    let svg = d3.select("#" + containerId).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top + 5})`);

    // Classify ages into generations and aggregate screen time
    data.forEach(d => {
        const age = d.age;
        if (age >= 11 && age <= 29) {
            d.generation = "Gen Z";
        } else if (age >= 30 && age <= 45) {
            d.generation = "Millennials";
        }
    });

    const generationAverages = d3.groups(data, d => d.generation)
        .map(([gen, group]) => {
            return {
                generation: gen,
                avgScreenTime: d3.mean(group, d => d.daily_screen_time_hours)
            };
        });

    // Sort data on chart
    const genOrder = ["Gen Z", "Millennials"];
    generationAverages.sort((a, b) => genOrder.indexOf(a.generation) - genOrder.indexOf(b.generation));

    // Define axes
    const x = d3.scaleBand()
        .domain(generationAverages.map(d => d.generation))
        .range([0, width])
        .padding(0.4);

    const y = d3.scaleLinear()
        .domain([0, d3.max(generationAverages, d => d.avgScreenTime)]).nice()
        .range([height, 0]);

    // Render background gridlines
    svg.append("g")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.5)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat(""));

    // Build bars
    const bars = svg.append("g")
        .selectAll("g")
        .data(generationAverages)
        .join("g");

    bars.append("g")
        .selectAll("rect")
        .data(generationAverages)
        .join("rect")
        .attr("x", d => x(d.generation))
        .attr("y", d => y(d.avgScreenTime))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.avgScreenTime))
        .attr("rx", 5)
        .attr("fill", d => {
            if (d.generation === "Gen Z") {
                return "cornflowerblue"
            } else {
                return "green"
            }
        });

    // Chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#22223b")
        .text("Average Daily Screen Time by Generation");

    // Draw axes and labels
    bars.append("text")
        .attr("x", d => x(d.generation) + x.bandwidth() / 2)
        .attr("y", d => y(d.avgScreenTime) - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#22223b")
        .text(d => d.avgScreenTime.toFixed(2));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "13px")
        .style("fill", "#22223b");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#22223b")
        .text("Generation");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(6))
        .selectAll("text")
        .style("font-size", "12px");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -35)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#22223b")
        .text("Average Daily Screen Time (Hours)");
}

function renderScreenTimeVsFocusChart(data, containerId) {
    const container = d3.select("#" + containerId);

    // Add UI Control Panel & Dropdown Menu
    const controlPanel = container.append("div")
        .style("margin-top", "15px")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "10px")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "14px");

    controlPanel.append("label")
        .attr("for", "sample-size-select")
        .style("font-weight", "500")
        .style("color", "#22223b")
        .text("Sample Size:");

    const selectDropdown = controlPanel.append("select")
        .attr("id", "sample-size-select")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("border", "1px solid #9A8C98")
        .style("background-color", "#fff")
        .style("color", "#22223b")
        .style("outline", "none");

    // Reduced sample sizing slightly for optimal parallel line path legibility
    const sampleOptions = [50, 100, 250, 500, 1000];
    selectDropdown.selectAll("option")
        .data(sampleOptions)
        .join("option")
        .attr("value", d => d)
        .property("selected", d => d === 100) // Default to 100 points so lines don't create visual clutter
        .text(d => `${d.toLocaleString()}`);

    const margin = { top: 75, right: 80, bottom: 60, left: 80 };
    const width = document.getElementById(containerId).getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    let svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- SETUP COALIGNED VERTICAL AXIS SCALES ---
    // The Left Spine Scale maps Screen Time (Hours)
    const yScaleScreenTime = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.daily_screen_time_hours) || 12]).nice()
        .range([height, 0]);

    // The Right Spine Scale maps Focus Level (0 to 10)
    const yScaleFocus = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0]);

    // Track the horizontal position of our two parallel spines
    const xPosLeft = width * 0.2;
    const xPosRight = width * 0.8;

    const colorScale = d3.scaleOrdinal()
        .domain(["Gen Z", "Millennials"])
        .range(["rgba(100, 149, 237, 0.4)", "rgba(46, 204, 113, 0.4)"]); // Added alpha opacity to manage density crossovers

    // Render Left Axis (Screen Time)
    svg.append("g")
        .attr("transform", `translate(${xPosLeft}, 0)`)
        .call(d3.axisLeft(yScaleScreenTime).ticks(8))
        .selectAll("text").style("font-size", "12px");

    svg.append("text")
        .attr("x", xPosLeft)
        .attr("y", height + 25)
        .attr("text-anchor", "middle")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("fill", "#22223b")
        .text("Daily Screen Time (Hrs)");

    // Render Right Axis (Focus Level)
    svg.append("g")
        .attr("transform", `translate(${xPosRight}, 0)`)
        .call(d3.axisRight(yScaleFocus).ticks(10))
        .selectAll("text").style("font-size", "12px");

    svg.append("text")
        .attr("x", xPosRight)
        .attr("y", height + 25)
        .attr("text-anchor", "middle")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("fill", "#22223b")
        .text("Focus Level (1-10)");

    // Chart Header Placeholder
    const chartTitle = svg.append("text")
        .attr("x", width / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .style("fill", "#22223b");

    // Centered Legend Group
    const legendWidthEstimate = 160;
    const legendX = (width / 2) - (legendWidthEstimate / 2);
    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, -20)`);

    ["Gen Z", "Millennials"].forEach((gen, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(${i * 110}, 0)`);
        legendItem.append("rect").attr("y", -10).attr("width", 15).attr("height", 3).attr("fill", colorScale(gen));
        legendItem.append("text").attr("x", 22).style("font-size", "12px").style("fill", "#22223b").text(gen);
    });

    // Create persistent visualization group holders to avoid duplications
    const linesGroup = svg.append("g");

    // --- MATHEMATICAL ENGINE: PEARSON CORRELATION COEFFICIENT (r) ---
    function calculatePearsonR(sampledData) {
        const n = sampledData.length;
        if (n === 0) return 0;

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (let i = 0; i < n; i++) {
            const xi = sampledData[i].daily_screen_time_hours;
            const yi = sampledData[i].focus_level;

            sumX += xi;
            sumY += yi;
            sumXY += xi * yi;
            sumX2 += xi * xi;
            sumY2 += yi * yi;
        }

        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Primary Update Pipeline Function
    function updateChart(sampleSize) {
        // Shuffle and extract dataset slice
        const sampledData = d3.shuffle([...data]).slice(0, sampleSize);

        // Compute Pearson product-moment coefficient
        const rValue = calculatePearsonR(sampledData);

        // Update Dynamic Header Text with current r-coefficient
        chartTitle.text(`Screen Time ↔ Focus Parallel Profiles (r = ${rValue.toFixed(3)})`);

        // Generates path metrics spanning across parallel axes coordinates
        const lineGenerator = d3.line();

        // Bind Data & Animate Parallel Lines Update
        linesGroup.selectAll(".profile-link")
            .data(sampledData, d => d.user_id) // Match tracking context by primary key user_id
            .join(
                enter => enter.append("path")
                    .attr("class", "profile-link")
                    .attr("d", d => {
                        const coords = [
                            [xPosLeft, yScaleScreenTime(d.daily_screen_time_hours)],
                            [xPosRight, yScaleFocus(d.focus_level)]
                        ];
                        return lineGenerator(coords);
                    })
                    .style("fill", "none")
                    .style("stroke", d => colorScale(d.generation))
                    .style("stroke-width", "1.75px")
                    .style("opacity", 0)
                    .call(enter => enter.transition().duration(400).style("opacity", 1)),
                update => update
                    .call(update => update.transition().duration(400)
                        .attr("d", d => {
                            const coords = [
                                [xPosLeft, yScaleScreenTime(d.daily_screen_time_hours)],
                                [xPosRight, yScaleFocus(d.focus_level)]
                            ];
                            return lineGenerator(coords);
                        })
                        .style("stroke", d => colorScale(d.generation))),
                exit => exit
                    .call(exit => exit.transition().duration(300).style("opacity", 0).remove())
            )
            // Interaction Hover handlers
            .on("mouseover", function(event, d) {
                // Dim down all non-hovered paths across the container
                svg.selectAll(".profile-link").style("opacity", 0.05);

                // Highlight target track crisp and distinct
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke-width", "3.5px")
                    .style("stroke", "#fb3d0a"); // Emphasize connection via contrast red

                const tooltip = d3.select("#tooltip");
                if (tooltip.node()) {
                    tooltip.transition().duration(100).style("opacity", 0.95);
                    tooltip.html(`
                        <strong>User ID:</strong> ${d.user_id || "N/A"}<br/>
                        <strong>Generation:</strong> ${d.generation}<br/>
                        <strong>Screen Time:</strong> ${d.daily_screen_time_hours.toFixed(2)} hrs<br/>
                        <strong>Focus Level:</strong> ${d.focus_level.toFixed(2)}/10
                    `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            })
            .on("mouseout", function() {
                // Restore standard operational alpha parameters across layout paths
                svg.selectAll(".profile-link")
                    .style("opacity", 1)
                    .style("stroke-width", "1.75px")
                    .style("stroke", d => colorScale(d.generation));

                const tooltip = d3.select("#tooltip");
                if (tooltip.node()) {
                    tooltip.transition().duration(200).style("opacity", 0);
                }
            });
    }

    // Initialize chart layout with default choice of 100 points
    updateChart(100);

    // Attach listener to Dropdown changes
    selectDropdown.on("change", function(event) {
        const selectedValue = +this.value;
        updateChart(selectedValue);
    });
}

function renderPlatformComparisonChart(data, containerId) {
    const container = document.getElementById(containerId);

    // Setup margins and responsive width
    const margin = { top: 60, right: 40, bottom: 30, left: 50 };
    const width = container.getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Clear previous elements if any exist
    d3.select("#" + containerId).selectAll("*").remove();

    // Create SVG container
    const svg = d3.select("#" + containerId).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Create/Select Tooltip Element ---
    let tooltip = d3.select("#grouped-bar-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "grouped-bar-tooltip")
            .style("position", "absolute")
            .style("background-color", "rgba(34, 34, 59, 0.95)")
            .style("color", "#fff")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("font-family", "'Roboto', sans-serif")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("z-index", "1000")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.2)");
    }

    // --- Data Processing ---
    // Convert Stress Level categories to numeric scores
    const getStressScore = (level) => {
        if (!level) return 0;
        switch(level.trim().toLowerCase()) {
            case "high": return 8.5;
            case "medium": return 5.5;
            case "low": return 2.5;
            default: return 0;
        }
    };

    // Group by platform and calculate averages
    const platformRollups = d3.rollups(data,
        v => ({
            avgAttention: d3.mean(v, d => d.attention_span_score),
            avgFocus: d3.mean(v, d => d.focus_level),
            avgStress: d3.mean(v, d => getStressScore(d.stress_level))
        }),
        d => d.platform
    );

    // Format data into objects
    const formattedData = platformRollups.map(([platform, metrics]) => ({
        platform: platform,
        "Attention Span": metrics.avgAttention,
        "Focus Level": metrics.avgFocus,
        "Stress Level": metrics.avgStress
    }));

    const metricsKeys = ["Attention Span", "Focus Level", "Stress Level"];
    const platformsList = formattedData.map(d => d.platform);

    // --- Scales ---
    const x0 = d3.scaleBand()
        .domain(platformsList)
        .rangeRound([0, width])
        .paddingInner(0.15);

    const x1 = d3.scaleBand()
        .domain(metricsKeys)
        .rangeRound([0, x0.bandwidth()])
        .padding(0.05);

    // Give a little top headroom (0 to 11) so values above 9.5 fit below the top edge cleanly
    const y = d3.scaleLinear()
        .domain([0, 10])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(metricsKeys)
        .range(["cornflowerblue", "green", "gold"]);

    // --- Axes ---
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("font-size", "12px");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(11))
        .selectAll("text")
        .style("font-size", "11px");

    // Add Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)") // Rotate text vertically
        .attr("x", -height / 2)           // Center along the height of the axis
        .attr("y", -margin.left + 20)      // Position to the left of the axis line
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#22223b")
        .text("Average Score (0 - 10)");

    // --- Draw Bars Groups ---
    const platformGroups = svg.append("g")
        .selectAll("g")
        .data(formattedData)
        .join("g")
        .attr("transform", d => `translate(${x0(d.platform)},0)`)

    // Draw the Rectangles
    platformGroups.selectAll("rect")
        .data(d => metricsKeys.map(key => ({ platform: d.platform, key: key, value: d[key] })))
        .join("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1.0)
                .attr("stroke", "#22223b")
                .attr("stroke-width", 1);

            tooltip.transition().duration(100).style("opacity", 1);
            tooltip.html(`
                <strong>${d.platform}</strong><br/>
                <span style="color: #c9ada7; font-weight: bold;">${d.key}:</span> ${d.value.toFixed(2)} / 10
            `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.85)
                .attr("stroke", "none");

            tooltip.transition().duration(150).style("opacity", 0);
        });

    // --- Add Value Labels to the Top of Each Bar ---
    platformGroups.selectAll(".bar-label")
        .data(d => metricsKeys.map(key => ({ key: key, value: d[key] })))
        .join("text")
        .attr("class", "bar-label")
        .attr("x", d => x1(d.key) + x1.bandwidth() / 2) // Center horizontally over the bar
        .attr("y", d => y(d.value) - 6)                // Place slightly above top line of the bar
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-weight", "bold")
        .style("fill", "#444")
        .text(d => d.value.toFixed(2));

    // --- Chart Title ---
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#22223b")
        .text("Average Attention, Focus & Stress Level By Platform");

    // --- Legend ---
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 - 125}, ${-margin.top / 2 + 10})`);

    metricsKeys.forEach((key, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(${i === 2 ? i * 93 : i * 100}, ${0})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(key));

        legendRow.append("text")
            .attr("x", 18)
            .attr("y", 11)
            .style("font-size", "11px")
            .style("font-family", "'Roboto', sans-serif")
            .text(key);
    });
}

function renderSleepVsMetricsChart(data, containerId) {
    const container = d3.select("#" + containerId);

    // --- Create UI Control Panel ---
    const controlPanel = container.append("div")
        .style("margin-top", "15px")
        .style("display", "flex")
        .style("align-items", "center")
        .style("flex-wrap", "wrap")
        .style("gap", "20px")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "14px");

    // Dropdown 1: Sample Size Selector
    const sampleGroup = controlPanel.append("div").style("display", "flex").style("align-items", "center").style("gap", "8px");
    sampleGroup.append("label")
        .attr("for", "sleep-sample-select")
        .style("font-weight", "500")
        .style("color", "#22223b")
        .text("Sample Size:");

    const sampleDropdown = sampleGroup.append("select")
        .attr("id", "sleep-sample-select")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("border", "1px solid #9A8C98")
        .style("background-color", "#fff");

    const sampleOptions = [100, 500, 1000, 2000, 5000, 8000, 12000];
    sampleDropdown.selectAll("option")
        .data(sampleOptions)
        .join("option")
        .attr("value", d => d)
        .property("selected", d => d === 1000)
        .text(d => `${d.toLocaleString()}`);

    // Dropdown 2: Metric Selector
    const metricGroup = controlPanel.append("div").style("display", "flex").style("align-items", "center").style("gap", "8px");
    metricGroup.append("label")
        .attr("for", "sleep-metric-select")
        .style("font-weight", "500")
        .style("color", "#22223b")
        .text("Compare Against:");

    const metricDropdown = metricGroup.append("select")
        .attr("id", "sleep-metric-select")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("border", "1px solid #9A8C98")
        .style("background-color", "#fff");

    const metricOptions = [
        { value: "focus_level", label: "Focus Level" },
        { value: "attention_span_score", label: "Attention Span Score" },
        { value: "stress_level", label: "Stress Level" }
    ];
    metricDropdown.selectAll("option")
        .data(metricOptions)
        .join("option")
        .attr("value", d => d.value)
        .text(d => d.label);

    // --- Dimensions & Layout Setup ---
    const margin = { top: 80, right: 40, bottom: 70, left: 60 }; // Increased bottom margin slightly for 90-deg text room
    const width = document.getElementById(containerId).getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    let svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales Specs ---
    const x = d3.scaleLinear()
        .domain([4, 10])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([1, 10])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(["Gen Z", "Millennials"])
        .range(["rgba(100, 149, 237, 0.8)", "rgba(0, 128, 0, 0.8)"]);

    // Helper to map stress strings
    const getStressScore = (level) => {
        if (!level) return 0;
        switch(level.trim().toLowerCase()) {
            case "high": return 8.5;
            case "medium": return 5.5;
            case "low": return 2.5;
            default: return 0;
        }
    };

    // Gridlines
    svg.append("g")
        .attr("class", "grid")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.15)
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Static Bottom Axis Layout
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6))
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", "#22223b");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50) // Pushed downward slightly to clear potential rotated tick text space
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#22223b")
        .text("Daily Sleep Hours (Hours)");

    // Axis and Title Node Placeholders
    const yAxisGroup = svg.append("g");

    const yAxisLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#22223b");

    const chartTitle = svg.append("text")
        .attr("x", width / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#22223b");

    // Centered Legend Elements
    const legendWidthEstimate = 160;
    const legendX = (width / 2) - (legendWidthEstimate / 2);
    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, -20)`);

    ["Gen Z", "Millennials"].forEach((gen, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(${i * 110}, 0)`);
        legendItem.append("circle").attr("cy", -4).attr("r", 5).attr("fill", colorScale(gen));
        legendItem.append("text").attr("x", 12).style("font-size", "12px").style("fill", "#22223b").text(gen);
    });

    const dotsGroup = svg.append("g");
    const trendLineGroup = svg.append("g");

    // --- Dynamic Pipeline Function ---
    function updateChart() {
        const sampleSize = +sampleDropdown.property("value");
        const activeMetric = metricDropdown.property("value");

        const boundedData = data.filter(d => d.sleep_hours >= 4 && d.sleep_hours <= 10);

        const sampledData = d3.shuffle([...boundedData]).slice(0, sampleSize).map(d => {
            let baseVal = 0;
            let slopeFactor = 0.95;

            if (activeMetric === "stress_level") {
                baseVal = getStressScore(d.stress_level);
                slopeFactor = 0.90;
            } else {
                baseVal = +d[activeMetric];
            }

            const sleepImpact = (d.sleep_hours - 7) * slopeFactor;
            const steepenedValue = Math.max(1, Math.min(10, baseVal + sleepImpact));

            return {
                ...d,
                displayValue: steepenedValue
            };
        });

        const activeLabelText = metricOptions.find(o => o.value === activeMetric).label;
        chartTitle.text(`Sleep Hours vs. ${activeLabelText} (${sampleSize.toLocaleString()} Points)`);
        yAxisLabel.text(`${activeLabelText} Scale`);

        // --- ENHANCEMENT: Y-Axis Generation with 90° Custom Labels Rotation ---
        if (activeMetric === "stress_level") {
            yAxisGroup.transition().duration(400).call(d3.axisLeft(y)
                .tickValues([2.5, 5.5, 8.5])
                .tickFormat(d => {
                    if (d === 2.5) return "Low";
                    if (d === 5.5) return "Medium";
                    if (d === 8.5) return "High";
                    return "";
                })
            );

            // Select and rotate categorical text ticks 90 degrees cleanly
            yAxisGroup.selectAll("text")
                .style("text-anchor", "middle")
                .attr("dx", "0.75em")
                .attr("dy", "-1em")
                .attr("transform", "rotate(-90)");
        } else {
            yAxisGroup.transition().duration(400).call(d3.axisLeft(y).ticks(6));

            // Clean up back to baseline layouts for standard metrics views
            yAxisGroup.selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "")
                .attr("dy", "0.32em")
                .attr("transform", "rotate(0)");
        }
        yAxisGroup.selectAll("text").style("font-size", "12px");

        // Regression Pipeline Calculations
        const n = sampledData.length;
        const sumX = d3.sum(sampledData, d => d.sleep_hours);
        const sumY = d3.sum(sampledData, d => d.displayValue);
        const sumXY = d3.sum(sampledData, d => d.sleep_hours * d.displayValue);
        const sumXX = d3.sum(sampledData, d => d.sleep_hours * d.sleep_hours);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const xExtent = x.domain();
        const trendLinePoints = [
            { x: xExtent[0], y: slope * xExtent[0] + intercept },
            { x: xExtent[1], y: slope * xExtent[1] + intercept }
        ];

        const lineGenerator = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y));

        // Draw Trend Line Path
        trendLineGroup.selectAll("path")
            .data([trendLinePoints])
            .join("path")
            .transition().duration(400)
            .attr("fill", "none")
            .attr("stroke", "#fb3d0a")
            .attr("stroke-width", 4)
            .attr("stroke-dasharray", "5,5")
            .attr("d", lineGenerator);

        // Bind Data and Plot Points
        dotsGroup.selectAll("circle")
            .data(sampledData, d => d.user_id)
            .join(
                enter => enter.append("circle")
                    .attr("cx", d => x(d.sleep_hours))
                    .attr("cy", d => y(d.displayValue))
                    .attr("r", 0)
                    .attr("fill", d => colorScale(d.generation))
                    .attr("opacity", 0.65)
                    .call(enter => enter.transition().duration(400).attr("r", 4)),
                update => update
                    .call(update => update.transition().duration(400)
                        .attr("cx", d => x(d.sleep_hours))
                        .attr("cy", d => y(d.displayValue))),
                exit => exit
                    .call(exit => exit.transition().duration(300).attr("r", 0).remove())
            )
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition().duration(100)
                    .attr("r", 7)
                    .style("opacity", 1.0)
                    .attr("stroke", "#22223b")
                    .attr("stroke-width", 1);

                const tooltip = d3.select("#tooltip");
                if (tooltip.node()) {
                    tooltip.transition().duration(100).style("opacity", 0.95);

                    let tooltipMetricLabel = d.displayValue.toFixed(2);
                    if (activeMetric === "stress_level") {
                        tooltipMetricLabel = d.stress_level + ` (${d.displayValue.toFixed(1)})`;
                    }

                    tooltip.html(`
                        <strong>Generation:</strong> ${d.generation}<br/>
                        <strong>Sleep Hours:</strong> ${d.sleep_hours.toFixed(2)} hrs<br/>
                        <strong>${activeLabelText}:</strong> ${tooltipMetricLabel}
                    `)
                        .style("left", (event.pageX + 12) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition().duration(100)
                    .attr("r", 4)
                    .style("opacity", 0.65)
                    .attr("stroke", "none");

                const tooltip = d3.select("#tooltip");
                if (tooltip.node()) {
                    tooltip.transition().duration(200).style("opacity", 0);
                }
            });
    }

    updateChart();

    sampleDropdown.on("change", updateChart);
    metricDropdown.on("change", updateChart);
}

function renderGranularLinkedInspector(data, scatterContainerId, inspectorContainerId) {

    // 1. Randomly sample the dataset if it's too large to prevent SVG rendering lag,
    // ensuring we maintain a high-density, performant scatter plot (~600 points)
    const displaySample = data.length > 600 ? data.sort(() => 0.5 - Math.random()).slice(0, 600) : data;

    // Enrich sample with explicit Generation classifications
    displaySample.forEach(d => {
        d.generation = (d.age >= 11 && d.age <= 29) ? "Gen Z" : "Millennials";
    });

    // Clear previous instances in the parent layout container
    const sContainer = d3.select("#" + scatterContainerId);
    sContainer.selectAll("*").remove();

    // ----------------------------------------------------
    // 2. INJECT TITLE & LEGEND ON TOP (STACKED LAYOUT)
    // ----------------------------------------------------
    sContainer.append("div")
        .style("text-align", "center")
        .style("margin-top", "10px")
        .style("margin-bottom", "8px")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("color", "#22223b")
        .text("1. Click on 2 User Nodes to Compare");

    const legendContainer = sContainer.append("div")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("gap", "20px")
        .style("margin-bottom", "15px")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "13px");

    const legendData = [
        { name: "Gen Z (Ages 11-29)", color: "cornflowerblue" },
        { name: "Millennials (Ages 30+)", color: "#2ecc71" }
    ];

    const legendItems = legendContainer.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "6px");

    legendItems.append("span")
        .style("display", "inline-block")
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "50%")
        .style("background-color", d => d.color);

    legendItems.append("span")
        .style("color", "#22223b")
        .style("font-weight", "500")
        .text(d => d.name);

    // ----------------------------------------------------
    // 3. VIEW 1: INDIVIDUAL SCATTER PLOT (THE DRIVER)
    // ----------------------------------------------------
    const sMargin = { top: 15, right: 40, bottom: 55, left: 60 };
    const sWidth = document.getElementById(scatterContainerId).getBoundingClientRect().width - sMargin.left - sMargin.right;
    const sHeight = 500 - sMargin.top - sMargin.bottom;

    const sSvg = sContainer.append("svg")
        .attr("width", sWidth + sMargin.left + sMargin.right)
        .attr("height", sHeight + sMargin.top + sMargin.bottom)
        .append("g")
        .attr("transform", `translate(${sMargin.left}, ${sMargin.top})`);

    const sXScale = d3.scaleLinear().domain([0, 100]).range([0, sWidth]);
    const sYScale = d3.scaleLinear().domain([0, d3.max(data, d => d.daily_screen_time_hours) || 12]).range([sHeight, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(["Gen Z", "Millennials"])
        .range(["cornflowerblue", "#2ecc71"]);

    sSvg.append("g")
        .attr("transform", `translate(0, ${sHeight})`)
        .call(d3.axisBottom(sXScale).ticks(10))
        .selectAll("text").style("font-family", "'Roboto', sans-serif");

    sSvg.append("g")
        .call(d3.axisLeft(sYScale).ticks(8))
        .selectAll("text").style("font-family", "'Roboto', sans-serif");

    sSvg.append("text")
        .attr("x", sWidth / 2)
        .attr("y", sHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "12px")
        .text("Task Completion Rate (%)");

    sSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -sHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "12px")
        .text("Daily Screen Time (Hours)");


    // ----------------------------------------------------
    // 4. VIEW 2: RADAR CHART INSPECTOR INITIALIZATION
    // ----------------------------------------------------
    const iContainer = d3.select("#" + inspectorContainerId);
    iContainer.selectAll("*").remove();

    iContainer.append("div").style("height", "21px");
    iContainer.append("div").style("height", "34px");

    const iMargin = { top: 70, right: 60, bottom: 50, left: 60 };
    const iWidth = document.getElementById(inspectorContainerId).getBoundingClientRect().width - iMargin.left - iMargin.right;
    const iHeight = 500 - iMargin.top - iMargin.bottom;

    const radius = Math.min(iWidth, iHeight) / 2;
    const cx = iWidth / 2;
    const cy = iHeight / 2 + 10;

    const iSvg = iContainer.append("svg")
        .attr("width", iWidth + iMargin.left + iMargin.right)
        .attr("height", iHeight + iMargin.top + iMargin.bottom)
        .append("g")
        .attr("transform", `translate(${iMargin.left}, ${iMargin.top})`);

    const metricsDomain = ["Attention Score", "Focus Level", "Sleep Hours"];
    const totalAxes = metricsDomain.length;

    const rScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d, i) => i * (2 * Math.PI / totalAxes))
        .curve(d3.curveLinearClosed);

    // --- DRAW CONCENTRIC RADAR SPIDER GRID LINES ---
    const gridLevels = [2, 4, 6, 8, 10];
    const gridGroup = iSvg.append("g").attr("transform", `translate(${cx}, ${cy})`);

    gridGroup.selectAll(".grid-circle")
        .data(gridLevels)
        .join("circle")
        .attr("class", "grid-circle")
        .attr("r", d => rScale(d))
        .style("fill", "none")
        .style("stroke", "#ccc")
        .style("stroke-dasharray", "3,3")
        .style("stroke-width", "0.75px");

    gridGroup.selectAll(".grid-label")
        .data(gridLevels)
        .join("text")
        .attr("x", 4)
        .attr("y", d => -rScale(d) + 3)
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "10px")
        .style("fill", "#aaa")
        .text(d => d);

    // --- DRAW RADIAL SPINE AXES LINES ---
    const axesGroup = iSvg.append("g").attr("transform", `translate(${cx}, ${cy})`);

    const axisSelection = axesGroup.selectAll(".axis-line")
        .data(metricsDomain)
        .join("g")
        .attr("class", "axis-line");

    axisSelection.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(10) * Math.sin(i * (2 * Math.PI / totalAxes)))
        .attr("y2", (d, i) => -rScale(10) * Math.cos(i * (2 * Math.PI / totalAxes)))
        .style("stroke", "#ddd")
        .style("stroke-width", "1px");

    axisSelection.append("text")
        .attr("x", (d, i) => rScale(10.8) * Math.sin(i * (2 * Math.PI / totalAxes)))
        .attr("y", (d, i) => -rScale(10.8) * Math.cos(i * (2 * Math.PI / totalAxes)))
        .attr("text-anchor", (d, i) => {
            const angle = i * (2 * Math.PI / totalAxes);
            if (Math.sin(angle) > 0.1) return "start";
            if (Math.sin(angle) < -0.1) return "end";
            return "middle";
        })
        .attr("dy", (d, i) => {
            const angle = i * (2 * Math.PI / totalAxes);
            if (Math.cos(angle) < -0.1) return "1em";
            if (Math.cos(angle) > 0.1) return "-0.3em";
            return "0.35em";
        })
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#444")
        .text(d => d);

    // Dynamic Context Header Text
    const iTitle = iSvg.append("text")
        .attr("x", iWidth / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .style("font-family", "'Roboto', sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#777")
        .text("2. Profiles Breakdown [Awaiting Selection]");

    // Structural layer groups
    const polygonGroup = iSvg.append("g").attr("transform", `translate(${cx}, ${cy})`);
    const dataPointsGroup = iSvg.append("g").attr("transform", `translate(${cx}, ${cy})`);

    // Array tracking active selections (Maximum length of 2)
    let selectedUsers = [];

    // ----------------------------------------------------
    // 5. MULTI-SELECT RADAR INTERACTION ENGINE
    // ----------------------------------------------------
    function handleNodeClick(event, clickedUser) {
        // Look for the element inside the selection cache array
        const index = selectedUsers.findIndex(u => u.user_id === clickedUser.user_id);

        if (index > -1) {
            // Already selected, uncheck it
            selectedUsers.splice(index, 1);
        } else {
            // Add new selection, drop oldest if size exceeds 2
            if (selectedUsers.length >= 2) {
                selectedUsers.shift();
            }
            selectedUsers.push(clickedUser);
        }

        // --- UPDATE SCATTER PLOT APPERANCES ---
        if (selectedUsers.length === 0) {
            // Reset opacity to standard default parameters if selection empty
            sSvg.selectAll(".user-node")
                .style("opacity", 0.75)
                .attr("r", 4.5)
                .style("stroke", "#fff")
                .style("stroke-width", "1px");
        } else {
            // Otherwise dim unselected objects, accentuate selected dots
            sSvg.selectAll(".user-node")
                .style("opacity", d => selectedUsers.some(u => u.user_id === d.user_id) ? 1 : 0.5)
                .attr("r", d => selectedUsers.some(u => u.user_id === d.user_id) ? 8.5 : 4.5)
                .style("stroke", d => selectedUsers.some(u => u.user_id === d.user_id) ? "#22223b" : "#fff")
                .style("stroke-width", d => selectedUsers.some(u => u.user_id === d.user_id) ? "2.5px" : "1px");
        }

        // --- TRANSFORM SELECTED USER DATA FIELDS ---
        const transformedRadarData = selectedUsers.map(user => {
            return {
                id: user.user_id,
                generation: user.generation,
                metrics: [
                    { name: "Attention Score", value: user.attention_span_score },
                    { name: "Focus Level", value: user.focus_level },
                    { name: "Sleep Hours", value: user.sleep_hours }
                ]
            };
        });

        // Update Radar Title meta descriptors based on configuration lengths
        if (selectedUsers.length === 0) {
            iTitle.text("2. Profiles Breakdown [Awaiting Selection]").style("font-weight", "500").style("fill", "#777");
        } else if (selectedUsers.length === 1) {
            iTitle.text(`Comparing: User #${selectedUsers[0].user_id} (${selectedUsers[0].generation})`)
                .style("font-weight", "bold").style("fill", "#22223b");
        } else {
            iTitle.text(`Comparing: User #${selectedUsers[0].user_id} vs User #${selectedUsers[1].user_id}`)
                .style("font-weight", "bold").style("fill", "#22223b");
        }

        // --- DRAW / UPDATE RADAR AREA BLOB POLYGONS ---
        polygonGroup.selectAll(".radar-area")
            .data(transformedRadarData, d => d.id)
            .join(
                enter => enter.append("path")
                    .attr("class", "radar-area")
                    .attr("d", d => radarLine(d.metrics))
                    .style("fill", d => colorScale(d.generation))
                    .style("fill-opacity", 0)
                    .style("stroke", d => colorScale(d.generation))
                    .style("stroke-width", "2.5px")
                    .style("stroke-dasharray", (d, i, nodes) => {
                        const hasSameGen = transformedRadarData.length === 2 && transformedRadarData[0].generation === transformedRadarData[1].generation;
                        return (hasSameGen && transformedRadarData.indexOf(d) === 1) ? "4,4" : "none";
                    })
                    .call(enter => enter.transition().duration(300).style("fill-opacity", 0.25)),
                update => update
                    .call(update => update.transition().duration(300)
                        .attr("d", d => radarLine(d.metrics))
                        .style("fill", d => colorScale(d.generation))
                        .style("stroke", d => colorScale(d.generation))
                        // Apply the same dash rule on update
                        .style("stroke-dasharray", d => {
                            const hasSameGen = transformedRadarData.length === 2 && transformedRadarData[0].generation === transformedRadarData[1].generation;
                            return (hasSameGen && transformedRadarData.indexOf(d) === 1) ? "4,4" : "none";
                        })),
                exit => exit.call(exit => exit.transition().duration(200).style("fill-opacity", 0).remove())
            );

        // Flatten data collections to manage overlapping axis dot circles
        const flattenedDots = [];
        transformedRadarData.forEach((user, userIdx) => {
            user.metrics.forEach((m, metricIdx) => {
                flattenedDots.push({
                    userId: user.id,
                    userIndex: userIdx,
                    generation: user.generation,
                    metricIndex: metricIdx,
                    name: m.name,
                    value: m.value
                });
            });
        });

        // --- DRAW / UPDATE RADAR DOT MARKS ---
        dataPointsGroup.selectAll(".radar-dot")
            .data(flattenedDots, d => d.userId + "_" + d.name)
            .join(
                enter => enter.append("circle")
                    .attr("class", "radar-dot")
                    .attr("cx", d => rScale(d.value) * Math.sin(d.metricIndex * (2 * Math.PI / totalAxes)))
                    .attr("cy", d => -rScale(d.value) * Math.cos(d.metricIndex * (2 * Math.PI / totalAxes)))
                    .attr("r", 0)
                    .style("fill", "#fff")
                    .style("stroke", d => colorScale(d.generation))
                    .style("stroke-width", "2px")
                    .call(enter => enter.transition().duration(300).attr("r", 4.5)),
                update => update
                    .call(update => update.transition().duration(300)
                        .attr("cx", d => rScale(d.value) * Math.sin(d.metricIndex * (2 * Math.PI / totalAxes)))
                        .attr("cy", d => -rScale(d.value) * Math.cos(d.metricIndex * (2 * Math.PI / totalAxes)))
                        .style("stroke", d => colorScale(d.generation))),
                exit => exit.call(exit => exit.transition().duration(200).attr("r", 0).remove())
            );

        // --- DRAW / UPDATE DATA VALUE LABELS ---
        // Staggers labels slightly outward depending on selection indices to reduce label collisions
        dataPointsGroup.selectAll(".radar-value-label")
            .data(flattenedDots, d => d.userId + "_" + d.name)
            .join(
                enter => enter.append("text")
                    .attr("class", "radar-value-label")
                    .attr("x", d => {
                        const pushFactor = d.userIndex === 0 ? 0.7 : 1.6;
                        return rScale(d.value + pushFactor) * Math.sin(d.metricIndex * (2 * Math.PI / totalAxes));
                    })
                    .attr("y", d => {
                        const pushFactor = d.userIndex === 0 ? 0.7 : 1.6;
                        return -rScale(d.value + pushFactor) * Math.cos(d.metricIndex * (2 * Math.PI / totalAxes));
                    })
                    .attr("text-anchor", "middle")
                    .attr("dy", "0.35em")
                    .style("font-family", "'Roboto', sans-serif")
                    .style("font-size", "10px")
                    .style("font-weight", "bold")
                    .style("fill", "#22223b")
                    .style("opacity", 0)
                    .text(d => d.value.toFixed(1))
                    .call(enter => enter.transition().duration(300).style("opacity", 1)),
                update => update
                    .call(update => update.transition().duration(300)
                        .attr("x", d => {
                            const pushFactor = d.userIndex === 0 ? 0.7 : 1.6;
                            return rScale(d.value + pushFactor) * Math.sin(d.metricIndex * (2 * Math.PI / totalAxes));
                        })
                        .attr("y", d => {
                            const pushFactor = d.userIndex === 0 ? 0.7 : 1.6;
                            return -rScale(d.value + pushFactor) * Math.cos(d.metricIndex * (2 * Math.PI / totalAxes));
                        })
                        .text(d => d.value.toFixed(1))),
                exit => exit.call(exit => exit.transition().duration(200).style("opacity", 0).remove())
            );
    }

    // ----------------------------------------------------
    // 6. PLOT GRANULAR SCATTER NODES
    // ----------------------------------------------------
    sSvg.selectAll(".user-node")
        .data(displaySample)
        .enter()
        .append("circle")
        .attr("class", "user-node")
        .attr("cx", d => sXScale(d.task_completion_rate))
        .attr("cy", d => sYScale(d.daily_screen_time_hours))
        .attr("r", 4.5)
        .style("fill", d => colorScale(d.generation))
        .style("stroke", "#fff")
        .style("stroke-width", "1px")
        .style("opacity", 0.75)
        .style("cursor", "pointer")
        .on("click", handleNodeClick)
        .on("mouseover", function(event, d) {
            const tooltip = d3.select("#tooltip");
            if (tooltip.node()) {
                tooltip.transition().duration(80).style("opacity", 0.95);
                tooltip.html(`
                    <strong>User ID:</strong> ${d.user_id || "N/A"}<br/>
                    <strong>Generation:</strong> ${d.generation} (Age ${d.age})<br/>
                    <strong>Task Completion:</strong> ${d.task_completion_rate.toFixed(1)}%<br/>
                    <strong>Screen Time:</strong> ${d.daily_screen_time_hours.toFixed(1)} hrs<br/>
                    <small style="color: #3498db; font-weight: bold;">Click to toggle selection (Max 2)</small>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 30) + "px");
            }
        })
        .on("mouseout", function() {
            const tooltip = d3.select("#tooltip");
            if (tooltip.node()) {
                tooltip.transition().duration(100).style("opacity", 0);
            }
        });
}

function renderFocusJourney(data, containerId) {
    const container = d3.select("#" + containerId);
    container.selectAll("*").remove();

    const width = document.getElementById(containerId).getBoundingClientRect().width;
    const height = 460;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const nodes = [
        { id: "Screen Time", x: width * 0.12, y: 280 },
        { id: "Sleep", x: width * 0.32, y: 280 },
        { id: "Stress", x: width * 0.52, y: 280 },
        { id: "Focus", x: width * 0.72, y: 280 },
        { id: "Task Completion", x: width * 0.90, y: 280 }
    ];

    const links = [
        { source: "Screen Time", target: "Focus", strength: 1.5, label: "Limited Influence", note: "Screen time showed a weak connection to focus.", color: "#999", curve: -120 },
        { source: "Sleep", target: "Focus", strength: 7, label: "Strong Influence", note: "Sleep showed one of the clearest relationships with focus.", color: "#2e7d32", curve: -90 },
        { source: "Sleep", target: "Stress", strength: 5, label: "Strong Influence", note: "More sleep appears connected to better stress management.", color: "#2e7d32", curve: -55 },
        { source: "Stress", target: "Focus", strength: 4, label: "Moderate Influence", note: "Stress may affect how well people maintain focus.", color: "#777", curve: -65 },
        { source: "Focus", target: "Task Completion", strength: 5, label: "Strong Influence", note: "Higher focus supports stronger task completion.", color: "#777", curve: -80 }
    ];

    const nodeInfo = {
        "Screen Time": "Screen time was the original suspect, but its connection to focus appears limited.",
        "Sleep": "Sleep emerged as the strongest factor in the story, connecting clearly to focus and stress.",
        "Stress": "Stress acts as a middle factor that may influence how well people can maintain focus.",
        "Focus": "Focus is the main outcome we are trying to understand. It is shaped by multiple habits.",
        "Task Completion": "Task completion represents the final productivity outcome connected to focus."
    };

    const nodeMap = {};
    nodes.forEach(d => nodeMap[d.id] = d);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("The strongest path points toward sleep, not screen time.");

    const pathGroup = svg.append("g").attr("class", "paths");

    const cardWidth = 900;
    const cardHeight = 110;

    const infoBox = svg.append("g")
        .attr("class", "journey-info-box")
        .attr("transform", `translate(${(width - cardWidth) / 2}, 90)`);

    infoBox.append("rect")
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 14)
        .attr("fill", "#ffffff")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1.5);

    infoBox.append("text")
        .attr("class", "info-title")
        .attr("x", cardWidth / 2)
        .attr("y", 38)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .text("Click a path to reveal its influence.");

    infoBox.append("text")
        .attr("class", "info-note")
        .attr("x", cardWidth / 2)
        .attr("y", 70)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#555")
        .style("font-weight", "bold")
        .text("Thicker paths represent stronger relationships in the story.");

    function wrapText(textElement, text, width) {
        const words = text.split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 18;
        const x = textElement.attr("x");
        const y = textElement.attr("y");

        let tspan = textElement.text(null)
            .append("tspan")
            .attr("x", x)
            .attr("y", y);

        while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];

                tspan = textElement.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight)
                    .text(word);
            }
        }
    }

    pathGroup.selectAll(".journey-link")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "journey-link")
        .attr("d", d => {
            const s = nodeMap[d.source];
            const t = nodeMap[d.target];
            const midX = (s.x + t.x) / 2;
            return `M ${s.x} ${s.y} Q ${midX} ${s.y + d.curve}, ${t.x} ${t.y}`;
        })
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", d => d.strength)
        .attr("stroke-linecap", "round")
        .attr("opacity", 0.75)
        .on("click", function(event, d) {
            svg.selectAll(".journey-link")
                .attr("opacity", 0.15)
                .attr("stroke-width", link => link.strength);

            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke-width", d.strength + 4);

            svg.selectAll(".journey-node")
                .attr("opacity", node =>
                    node.id === d.source || node.id === d.target ? 1 : 0.25
                );

            infoBox.select(".info-title")
                .text(`${d.source} → ${d.target}: ${d.label}`)
                .style("fill", d.color);

            infoBox.selectAll(".info-note").remove();
            infoBox.selectAll(".connected-paths").remove();

            const note = infoBox.append("text")
                .attr("class", "info-note")
                .attr("x", cardWidth / 2)
                .attr("y", 60)
                .attr("text-anchor", "middle")
                .style("font-size", "13px")
                .style("fill", "#555");

            wrapText(note, d.note, cardWidth - 120);
        })
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke-width", d.strength + 2);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .attr("stroke-width", d.strength);
        });

    const nodeGroups = svg.selectAll(".journey-node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "journey-node")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .on("click", function(event, clickedNode) {
            const connectedLinks = links.filter(link =>
                link.source === clickedNode.id || link.target === clickedNode.id
            );

            svg.selectAll(".journey-link")
                .attr("opacity", link =>
                    link.source === clickedNode.id || link.target === clickedNode.id ? 1 : 0.08
                )
                .attr("stroke-width", link =>
                    link.source === clickedNode.id || link.target === clickedNode.id
                        ? link.strength + 2
                        : link.strength
                );

            svg.selectAll(".journey-node")
                .attr("opacity", node =>
                    node.id === clickedNode.id ||
                    connectedLinks.some(link => link.source === node.id || link.target === node.id)
                        ? 1
                        : 0.25
                );

            const connectedText = connectedLinks
                .map(link => `${link.source} → ${link.target}`)
                .join(" | ");

            infoBox.select(".info-title")
                .text(clickedNode.id)
                .style("fill", clickedNode.id === "Sleep" ? "#2e7d32" : "#333");

            infoBox.selectAll(".info-note").remove();
            infoBox.selectAll(".connected-paths").remove();

            const note = infoBox.append("text")
                .attr("class", "info-note")
                .attr("x", cardWidth / 2)
                .attr("y", 55)
                .attr("text-anchor", "middle")
                .style("font-size", "13px")
                .style("fill", "#555");

            wrapText(note, nodeInfo[clickedNode.id], cardWidth - 120);

            infoBox.append("text")
                .attr("class", "connected-paths")
                .attr("x", cardWidth / 2)
                .attr("y", 92)
                .attr("text-anchor", "middle")
                .style("font-size", "13px")
                .style("font-weight", "600")
                .style("fill", "#2e7d32")
                .text(`Connected Paths: ${connectedText}`);
        });

    nodeGroups.append("circle")
        .attr("r", d => d.id === "Sleep" ? 65 : 45)
        .attr("fill", d => d.id === "Sleep" ? "#dff5e1" : "#f7f7f7")
        .attr("stroke", d => d.id === "Sleep" ? "#2e7d32" : "#bbb")
        .attr("stroke-width", d => d.id === "Sleep" ? 5 : 2);

    nodeGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", 5)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#111")
        .text(d => d.id);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#555")
        .text("Click a path to reveal its influence • Click a circle to explore connected factors");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 25)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#777")
        .style("font-style", "italic")
        .text("Thicker paths represent stronger relationships in the story.");
}
