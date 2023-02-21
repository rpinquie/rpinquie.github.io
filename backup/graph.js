// method to get page height
function pageHeight() {
    var lReturn = window.innerHeight;
    if (typeof lReturn == "undefined") {
        if (typeof document.documentElement != "undefined" && typeof document.documentElement.clientHeight != "undefined") {
            lReturn = document.documentElement.clientHeight;
        } else if (typeof document.body != "undefined") {
            lReturn = document.body.clientHeight;
        }
    }
    return lReturn;
}

// method to get page width
function pageWidth() {
    var lReturn = window.innerWidth;
    if (typeof lReturn == "undefined") {
        if (typeof document.documentElement != "undefined" && typeof document.documentElement.clientWidth != "undefined") {
            lReturn = document.documentElement.clientWidth;
        } else if (typeof document.body != "undefined") {
            lReturn = document.body.clientWidth;
        }
    }
    return lReturn;
}

d3.json("data.json", function(data) {
  drawGraph(data);
});

// Create Graph using d3.js force-directed layout
function drawGraph (data) {
		
	var links = data.edges;
	var nodes = data.nodes;
	
    // Compute the distinct nodes from the links.
    links.forEach(function (link) {
        link.source = nodes[link.source] || (nodes[link.source] = {
            name: link.source
        });
        link.target = nodes[link.target] || (nodes[link.target] = {
            name: link.target
        });
    });

    var w = pageWidth() - 10,
        h = pageHeight() - 10;

    var force = d3.layout.force()
                  .nodes(d3.values(nodes))
                  .links(links)
                  .size([w, h])
                  .linkDistance(60)
                  .charge(-300)
                  .on("tick", tick)
                  .start();

    var svg = d3.select(".graphContainer").append("svg:svg")
                .attr("width", w)
                .attr("height", h);

	// define arrow markers for graph links
	svg.append('svg:defs').append('svg:marker')
		.attr('id', 'end-arrow')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 6)
		.attr('markerWidth', 3)
		.attr('markerHeight', 3)
		.attr('orient', 'auto')
	  .append('svg:path')
		.attr('d', 'M0,-5L10,0L0,5')
		.attr('fill', '#000');

	svg.append('svg:defs').append('svg:marker')
		.attr('id', 'start-arrow')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 4)
		.attr('markerWidth', 3)
		.attr('markerHeight', 3)
		.attr('orient', 'auto')
	  .append('svg:path')
		.attr('d', 'M10,-5L0,0L10,5')
		.attr('fill', '#000');
	
    var color = d3.scale.category10();
	
    var path = svg.append("svg:g")
                  .selectAll("path")
                  .data(force.links())
                  .enter().append("svg:path")
                  .attr("class", function (d) {
					return "link " + d.type;
                  })
				  .style("stroke", function(d) {
					if (d.type == "IS_A_KIND_OF") return "cyan";
					else if (d.type == "DIVIDE THE") return "red";})


    var circle = svg.append("svg:g")
                    .selectAll("circle")
                    .data(force.nodes())
                    .enter().append("svg:circle")
                    .attr("r", 6)
                    .call(force.drag)
					  .style("fill", function (d) { return '#1f77b4'; })


    var text = svg.append("svg:g")
                  .selectAll("g")
                  .data(force.nodes())
                  .enter().append("svg:g")
                  .attr("class", "nodeText");

    // A copy of the text with a thick white stroke for legibility.
    text.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "shadow")
        .text(function (d) {
            return d.name;
        });

    text.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .text(function (d) {
            return d.name;
        });


    // update force layout (called automatically each iteration)
	function tick() {
	  // draw directed edges with proper padding from node centers
	  path.attr('d', function(d) {
		var deltaX = d.target.x - d.source.x,
			deltaY = d.target.y - d.source.y,
			dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
			normX = deltaX / dist,
			normY = deltaY / dist,
			sourcePadding = d.left ? 17 : 12,
			targetPadding = d.right ? 17 : 12,
			sourceX = d.source.x + (sourcePadding * normX),
			sourceY = d.source.y + (sourcePadding * normY),
			targetX = d.target.x - (targetPadding * normX),
			targetY = d.target.y - (targetPadding * normY);
		return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
	  });

        circle.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

        text.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    }

    // Method to create the filter
    createFilter();

    // Method to create the filter, generate checkbox options on fly
    function createFilter() {
        d3.select(".filterContainer").selectAll("div")
          .data(["IS_A_KIND_OF", "IS_A_PART_OF", "resolved"])
          .enter()  
          .append("div")
          .attr("class", "checkbox-container")
          .append("label")
          .each(function (d) {
                // create checkbox for each data
                d3.select(this).append("input")
                  .attr("type", "checkbox")
                  .attr("id", function (d) {
                      return "chk_" + d;
                   })
                  .attr("checked", true)
                  .on("click", function (d, i) {
                      // register on click event
                      var lVisibility = this.checked ? "visible" : "hidden";
                      filterGraph(d, lVisibility);
                   })
                d3.select(this).append("span")
                    .text(function (d) {
                        return d;
                    });
        });
        $("#sidebar").show();
    }

    // Method to filter graph
    function filterGraph(aType, aVisibility) {
        // change the visibility of the connection path
        path.style("visibility", function (o) {
            var lOriginalVisibility = $(this).css("visibility");
            return o.type === aType ? aVisibility : lOriginalVisibility;
        });

        // change the visibility of the node
        // if all the links with that node are invisibile, the node should also be invisible
        // otherwise if any link related to that node is visibile, the node should be visible
        circle.style("visibility", function (o, i) {
            var lHideNode = true;
            path.each(function (d, i) {
                if (d.source === o || d.target === o) {
                    if ($(this).css("visibility") === "visible") {
                        lHideNode = false;
                        // we need show the text for this circle
                        d3.select(d3.selectAll(".nodeText")[0][i]).style("visibility", "visible");
                        return "visible";
                    }
                }
            });
            if (lHideNode) {
                // we need hide the text for this circle 
                d3.select(d3.selectAll(".nodeText")[0][i]).style("visibility", "hidden");
                return "hidden";
            }
        });
    }
}