// Calculate dimensions
const totalWidth = window.innerWidth * 2;
const bubbleHeight = window.innerHeight;
const columns = 10;
const columnWidth = totalWidth / columns;
const padding = 30;

// Scroll state
const SCROLL_CONFIG = {
    amount: 300,
    duration: 600,
    threshold: 50,
    hideDelay: 1500
};


const leftIndicator = d3.select(".scroll-indicator.left");
const rightIndicator = d3.select(".scroll-indicator.right");

// Set up the containers
const container = d3.select("#viz")
    .style("position", "relative")
    .style("width", "100%")
    .style("height", "100vh");

// Create scrollable container for bubble chart
const scrollContainer = container.append("div")
    .style("overflow-x", "auto")
    .style("overflow-y", "hidden")
    .style("height", bubbleHeight + "px");

// Create SVG in scrollable container
const svg = scrollContainer.append("svg")
    .attr("width", totalWidth)
    .attr("height", bubbleHeight)
    .style("background-color", "#ff483b");

// Create main groups for bubble chart
const bubbleChartGroup = svg.append("g")
    .attr("class", "bubble-chart");

const linksGroup = bubbleChartGroup.append("g")
    .attr("class", "links")
    .attr("pointer-events", "none");

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Text handling
function truncateText(text, radius) {
    const maxChars = Math.floor(radius / 3.5);
    if (text.length > maxChars) {
        if (maxChars < 3) return '';
        return text.slice(0, maxChars - 2) + '..';
    }
    return text;
}

function calculateFontSize(radius) {
    return Math.min(radius / 3, 12);
}

// Path creation
function createPath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const curvature = 1.5;
    return `M${x1},${y1}A${dr * curvature},${dr * curvature} 0 0,1 ${x2},${y2}`;
}

// tooltip creation
function createEnhancedTooltip(d) {
    const maxStat = Math.max(
        d.data.power, 
        d.data.combat, 
        d.data.intelligence, 
        d.data.strength,
        d.data.speed,
        d.data.durability
    );

    const stats = [
        { label: 'Power', value: d.data.power },
        { label: 'Combat', value: d.data.combat },
        { label: 'Intelligence', value: d.data.intelligence },
        { label: 'Strength', value: d.data.strength },
        { label: 'Speed', value: d.data.speed },
        { label: 'Durability', value: d.data.durability }
    ];

    const statsHTML = stats.map(stat => `
        <div class="stat-row">
            <div class="stat-label">${stat.label}</div>
            <div class="stat-bar-container">
                <div class="stat-bar" style="width: ${(stat.value / maxStat) * 100}%"></div>
            </div>
            <div class="stat-value">${stat.value}</div>
        </div>
    `).join('');

    return `
        <div class="tooltip-content">
            <div class="tooltip-image">
                <img src="${d.data.url}" alt="${d.data.name}" 
                     onerror="this.onerror=null; this.src='/api/placeholder/80/80'"/>
            </div>
            <div class="tooltip-info">
                <div class="tooltip-header">${d.data.name}</div>
                ${statsHTML}
                <div class="stat-row">
                    <div class="stat-label">Publisher</div>
                    <div style="color: #fff">${d.data.publisher}</div>
                </div>
            </div>
        </div>
    `;
}

// scroll handling
function setupScrollHandling(scrollContainer, leftIndicator, rightIndicator) {
    let scrolling = false;
    let scrollTimeout;

    // Wheel event handler with smooth scrolling
    scrollContainer.on('wheel', function(event) {
        event.preventDefault();
        
        if (!scrolling) {
            const isScrollingRight = event.deltaY > 0;
            const currentScroll = this.scrollLeft;
            const targetScroll = currentScroll + (isScrollingRight ? 
                SCROLL_CONFIG.amount : -SCROLL_CONFIG.amount);
            
            scrolling = true;
            
            d3.select(this)
                .transition()
                .duration(SCROLL_CONFIG.duration)
                .ease(d3.easeCubicOut)
                .tween("scroll", function() {
                    const i = d3.interpolateNumber(currentScroll, targetScroll);
                    return function(t) {
                        this.scrollLeft = i(t);
                    };
                })
                .on("end", () => {
                    scrolling = false;
                });
        }
    });

    // scroll indicator logic
    function updateScrollIndicators() {
        const container = scrollContainer.node();
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        
        leftIndicator
            .transition()
            .duration(200)
            .style("opacity", currentScroll > SCROLL_CONFIG.threshold ? 1 : 0);
        
        rightIndicator
            .transition()
            .duration(200)
            .style("opacity", maxScroll - currentScroll > SCROLL_CONFIG.threshold ? 1 : 0);
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            leftIndicator
                .transition()
                .duration(400)
                .style("opacity", 0);
            rightIndicator
                .transition()
                .duration(400)
                .style("opacity", 0);
        }, SCROLL_CONFIG.hideDelay);
    }

    // scroll event listener
    scrollContainer.on('scroll', updateScrollIndicators);

    // keyboard navigation
    d3.select("body").on("keydown", function(event) {
        if (!scrolling && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
            const container = scrollContainer.node();
            const currentScroll = container.scrollLeft;
            const scrollAmount = event.key === "ArrowRight" ? 
                SCROLL_CONFIG.amount : -SCROLL_CONFIG.amount;
            
            scrolling = true;
            
            d3.select(container)
                .transition()
                .duration(SCROLL_CONFIG.duration)
                .ease(d3.easeCubicOut)
                .tween("scroll", function() {
                    const i = d3.interpolateNumber(
                        currentScroll,
                        currentScroll + scrollAmount
                    );
                    return function(t) {
                        container.scrollLeft = i(t);
                    };
                })
                .on("end", () => {
                    scrolling = false;
                });
        }
    });

    // Touch event handling for mobile
    let touchStartX = 0;
    let touchStartScroll = 0;

    scrollContainer
        .on('touchstart', function(event) {
            touchStartX = event.touches[0].clientX;
            touchStartScroll = this.scrollLeft;
        })
        .on('touchmove', function(event) {
            if (!scrolling) {
                const touch = event.touches[0];
                const deltaX = touchStartX - touch.clientX;
                this.scrollLeft = touchStartScroll + deltaX;
            }
        });

    // Initialize scroll indicators
    updateScrollIndicators();
    
    // Window resize handler
    window.addEventListener('resize', updateScrollIndicators);

    // Return cleanup function
    return () => {
        window.removeEventListener('resize', updateScrollIndicators);
        clearTimeout(scrollTimeout);
    };
}

const cleanup = setupScrollHandling(scrollContainer, leftIndicator, rightIndicator);

// Initialize indicators
leftIndicator.style("opacity", 0);
rightIndicator.style("opacity", 1);

// Load and process the data
d3.csv("superheroes_data.csv").then(data => {
    console.log("Data loaded:", data.length, "heroes");
    
    // Convert numeric strings to numbers
    data.forEach(d => {
        d.intelligence = +d.intelligence;
        d.strength = +d.strength;
        d.speed = +d.speed;
        d.durability = +d.durability;
        d.power = +d.power;
        d.combat = +d.combat;
        d.totalStats = d.intelligence + d.strength + d.speed + 
                      d.durability + d.power + d.combat;
    });

    // Function to find related heroes by publisher
    function findRelatedHeroes(hero) {
        return data.filter(d => d.publisher === hero.publisher && d !== hero);
    }

    // Sort data by power
    data.sort((a, b) => b.power - a.power);

    // Group data into columns based on combat ability
    const columnGroups = Array.from({length: columns}, (_, i) => {
        const min = i * (100 / columns);
        const max = (i + 1) * (100 / columns);
        return data.filter(d => d.combat >= min && d.combat < max);
    });

    // Create a map to store all hero elements
    const heroElementsMap = new Map();

    // Draw columns
    columnGroups.forEach((heroes, columnIndex) => {
        const column = bubbleChartGroup.append("g")
            .attr("class", "column")
            .attr("transform", `translate(${columnIndex * columnWidth + padding/2}, ${padding/2})`);

        // Create hierarchy for pack layout
        const packData = d3.hierarchy({children: heroes})
            .sum(d => d.power);

        // Create pack layout
        const pack = d3.pack()
            .size([columnWidth - padding, bubbleHeight - padding])
            .padding(4);

        const packed = pack(packData);

        // Create groups for circles and labels
        const heroGroups = column.selectAll("g")
            .data(packed.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        // Store reference to each hero element
        heroGroups.each(function(d) {
            heroElementsMap.set(d.data, {
                element: this,
                x: d.x + columnIndex * columnWidth + padding/2,
                y: d.y + padding/2,
                data: d.data
            });
        });

        // Draw circles
        heroGroups.append("circle")
            .attr("r", d => d.r)
            .attr("fill", d => d.data.alignment === "good" ? "#ffffff" : 
                            d.data.alignment === "bad" ? "#000000" : 
                            "rgba(255, 255, 255, 0.3)")
            .attr("opacity", 0.85)
            .attr("stroke", "rgba(255, 255, 255, 0.2)")
            .attr("stroke-width", 0.5);

        // Add labels
        heroGroups.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .style("font-family", '"SF Mono", Monaco, "Andale Mono", monospace')
            .style("font-size", d => Math.min(d.r / 4, 10) + "px")
            .style("fill", d => d.data.alignment === "good" ? "#000000" : "#ffffff")
            .style("font-weight", "400")
            .style("letter-spacing", "0.02em")
            .style("pointer-events", "none")
            .text(d => {
                if (d.r < 15) return '';
                return truncateText(d.data.name, d.r);
            });

            // Click handler for showing related heroes
        heroGroups.on("click", function(event, d) {
            event.stopPropagation();

            // Clear previous state
            linksGroup.selectAll("path").remove();
            d3.selectAll("circle")
                .classed("highlighted", false)
                .classed("dimmed", false);

            // Dim all circles
            d3.selectAll("circle").classed("dimmed", true);

            // Get clicked hero info
            const clickedHero = heroElementsMap.get(d.data);

            // Highlight clicked circle
            d3.select(this).select("circle")
                .classed("highlighted", true)
                .classed("dimmed", false);

            // Draw links to related heroes
            const relatedHeroes = findRelatedHeroes(d.data);
            
            relatedHeroes.forEach(hero => {
                const relatedHero = heroElementsMap.get(hero);
                if (relatedHero) {
                    const path = linksGroup.append("path")
                        .attr("d", createPath(
                            clickedHero.x, 
                            clickedHero.y, 
                            relatedHero.x, 
                            relatedHero.y
                        ))
                        .attr("class", "link")
                        .style("fill", "none")
                        .style("stroke", "rgba(255, 255, 255, 0.4)")
                        .style("stroke-width", 0.5);

                    // Animate path
                    const pathLength = path.node().getTotalLength();
                    path
                        .style("stroke-dasharray", pathLength)
                        .style("stroke-dashoffset", pathLength)
                        .transition()
                        .duration(1000)
                        .ease(d3.easeLinear)
                        .style("stroke-dashoffset", 0);

                    // Highlight related hero
                    d3.select(relatedHero.element).select("circle")
                        .classed("highlighted", true)
                        .classed("dimmed", false);
                }
            });
        });

        // Hover interactions
        heroGroups.on("mouseover", function(event, d) {
            d3.select(this).select("circle")
                .attr("opacity", 1)
                .attr("stroke-width", 2);

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            const mouseX = event.pageX;
            const mouseY = event.pageY;
            
            const tooltipWidth = 240;  // Reduced width
            const tooltipHeight = 200;  // Reduced height
            
            // Calculate position ensuring tooltip stays in viewport
            let tooltipX = mouseX + 10;
            let tooltipY = mouseY - 10;
            
            // Right edge check
            if (tooltipX + tooltipWidth > viewportWidth) {
                tooltipX = mouseX - tooltipWidth - 10;
            }
            
            // Bottom edge check
            if (tooltipY + tooltipHeight > viewportHeight) {
                tooltipY = viewportHeight - tooltipHeight - 10;
            }
            
            // Left edge check
            if (tooltipX < 0) {
                tooltipX = 10;
            }
            
            // Top edge check
            if (tooltipY < 0) {
                tooltipY = 10;
            }

            tooltip
                .html(createEnhancedTooltip(d))
                .style("left", tooltipX + "px")
                .style("top", tooltipY + "px")
                .classed("visible", true)
                .transition()
                .duration(200)
                .style("opacity", 1);
        })
        .on("mouseout", function() {
            d3.select(this).select("circle")
                .attr("opacity", 0.7)
                .attr("stroke-width", 0.5);

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    });

    // Clear everything when clicking background
    svg.on("click", function(event) {
        if (event.target === this) {
            linksGroup.selectAll("path").remove();
            d3.selectAll("circle")
                .classed("highlighted", false)
                .classed("dimmed", false);
        }
    });

}).catch(error => {
    console.error("Error loading the data:", error);
});