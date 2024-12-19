class Cell {
    constructor(site) {
        this.site = site; // voronoi site
        this.halfedges = []; // cell boundary
    }

    // removes halfedges and sorts them counterclockwise
    prepareHalfedges() {
        let iHalfedge = this.halfedges.length;

        while (iHalfedge--) {
            const edge = this.halfedges[iHalfedge].edge;
            if (!edge.va || !edge.vb) {
                this.halfedges.splice(iHalfedge, 1);
            }
        }

        this.halfedges.sort((a, b) => b.angle - a.angle); // sort counterclockwise
        return this.halfedges.length;
    }

    copy() {
        const cell = new Cell(this.site.copy());
        cell.halfedges = this.halfedges.map(halfedge => halfedge.copy());
        return cell;
    }
}

class Halfedge {
    constructor(edge, lSite, rSite) {
        this.site = lSite; // site to the left
        this.edge = edge;

        // calculate angle to sort by; use perpendicular line if no rSite
        if (rSite) {
            this.angle = Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x);
        } else {
            const { va, vb } = edge;
            this.angle = edge.lSite === lSite
                ? Math.atan2(vb.x - va.x, va.y - vb.y)
                : Math.atan2(va.x - vb.x, vb.y - va.y);
        }
    }

    getStartpoint() {
        return this.edge.lSite === this.site ? this.edge.va : this.edge.vb;
    }

    getEndpoint() {
        return this.edge.lSite === this.site ? this.edge.vb : this.edge.va;
    }

    copy() {
        return new Halfedge(this.edge?.copy(), this.site?.copy(), this.edge?.rSite?.copy());
    }
}

class Edge {
    constructor(lSite, rSite, va = null, vb = null) {
        this.lSite = lSite;
        this.rSite = rSite;
        this.va = va; // starting vertex
        this.vb = vb; // ending vertex
    }

    setEdgeStartpoint(lSite, rSite, vertex) {
        if (!this.va && !this.vb) {
            this.va = vertex;
            this.lSite = lSite;
            this.rSite = rSite;
        } else if (this.lSite === rSite) {
            this.vb = vertex;
        } else {
            this.va = vertex;
        }
    }

    setEdgeEndpoint(lSite, rSite, vertex) {
        this.setEdgeStartpoint(rSite, lSite, vertex);
    }

    copy() {
        return new Edge(this.lSite?.copy(), this.rSite?.copy(), this.va?.copy(), this.vb?.copy());
    }

}

class Diagram {
    constructor(site) {
        this.site = site;
    }
}

class Vertex {
    constructor(x, y, voronoiId = -1) {
        this.x = x;
        this.y = y;
        this.voronoiId = voronoiId;
    }

    copy() {
        return new Vertex(this.x, this.y, this.voronoiId);
    }
}

class Beachsection {
    constructor(site) {
        this.site = site;
    }

    copy() {
        return new Beachsection(this.site.copy());
    }
}

class CircleEvent {
    constructor() {
        this.arc = null;
        this.rbLeft = this.rbRight = null;
        this.rbPrevious = this.rbNext = null;
        this.rbParent = null;
        this.rbRed = false;
        this.site = null;
        this.x = this.y = this.ycenter = this.radius = 0;
    }

    copy() {
        const ce = new CircleEvent();
        ce.arc = this.arc?.copy();
        ce.site = this.site?.copy();
        ce.rbLeft = this.rbLeft?.copy();
        ce.rbPrevious = this.rbPrevious?.copy();
        ce.rbParent = this.rbParent?.copy();
        ce.rbRed = this.rbRed;
        ce.x = this.x;
        ce.y = this.y;
        ce.ycenter = this.ycenter;
        ce.radius = this.radius;
        return ce;
    }
}

class Voronoi {

    constructor() {
        this.vertices = [];
        this.edges = [];
        this.cells = [];

        // BBST for beachline and circle events
        this.beachline = new RedBlackTree();
        this.circleEvents = new RedBlackTree();
        this.firstCircleEvent = null;
    }

    eqEps(a, b) {
        return Math.abs(a - b) < 1e-9;
    }
    neqEps(a, b) {
        return !this.eqEps(a, b);
    }
    gtEps(a, b) {
        return a - b > 1e-9;
    }
    ltEps(a, b) {
        return b - a > 1e-9;
    }

    reset() {
        this.beachline = new RedBlackTree();
        this.circleEvents = new RedBlackTree();
        this.firstCircleEvent = null;
        this.vertices = [];
        this.edges = [];
        this.cells = [];
    }

    createVertex(x, y) {
        const v = new Vertex(x, y);
        this.vertices.push(v);
        return v;
    }

    createEdge(lSite, rSite, va, vb) {
        const edge = new Edge(lSite, rSite, null, null);
        this.edges.push(edge);
        
        if (va) edge.setEdgeStartpoint(lSite, rSite, va);
        if (vb) edge.setEdgeEndpoint(lSite, rSite, vb);

        // create halfedges for the left and right sites
        this.cells[lSite.voronoiId].halfedges.push(new Halfedge(edge, lSite, rSite));
        this.cells[rSite.voronoiId].halfedges.push(new Halfedge(edge, rSite, lSite));
        return edge;
    }

    createBorderEdge(lSite, va, vb) {
        const edge = new Edge(lSite, null, va, vb);
        this.edges.push(edge);
        return edge;
    }

    leftBreakPoint(arc, sweepLineY) {
        if (this.eqEps(arc.site.y, sweepLineY)) return arc.site.x; // degenerate case: focus is on the sweepLineY
        if (!arc.rbPrevious) return -Infinity; // no predecessor means breakpoint is at -Infinity
        if (this.eqEps(arc.rbPrevious.site.y, sweepLineY)) return arc.rbPrevious.site.x; // degenerate case: left focus is on the sweepLineY
        const hl = arc.rbPrevious.site.x - arc.site.x; // horizontal distance between focuses
        const aby2 = (1 / (arc.site.y - sweepLineY)) - (1 / (arc.rbPrevious.site.y - sweepLineY)); // difference in coefficients
        if (!aby2) return (arc.site.x + arc.rbPrevious.site.x) / 2; // special case: parabolas are equidistant so return midpoint between focus

        // solve for the breakpoint using quadratic formula
        const b = hl / (arc.rbPrevious.site.y - sweepLineY); // linear term in the quadratic equation
        const discriminant = (b * b) - (2 * aby2) * (
            (hl * hl / (-2 * (arc.rbPrevious.site.y - sweepLineY))) - arc.rbPrevious.site.y +
            ((arc.rbPrevious.site.y - sweepLineY) / 2) + arc.site.y - ((arc.site.y - sweepLineY) / 2)
        );
        return (-b + Math.sqrt(discriminant)) / aby2 + arc.site.x;
    }

    rightBreakPoint(arc, sweepLineY) {
        // the right breakpoint is the left breakpoint of the right neighbor
        if (arc.rbNext) return this.leftBreakPoint(arc.rbNext, sweepLineY);

        // fallback: if no right neighbor exists
        return arc.site.y === sweepLineY ? arc.site.x : Infinity;
    }

    detachBeachsection(beachsection) {
        this.detachCircleEvent(beachsection); // detach potentially attached circle event
        this.beachline.Remove(beachsection); // remove from RB-tree
    }

    removeBeachsection(beachsection) {
        const circle = beachsection.circleEvent;
        const x = circle.x;
        const y = circle.ycenter;
        const vertex = this.createVertex(x, y);

        // get neighboring arcs
        let previous = beachsection.rbPrevious;
        let next = beachsection.rbNext;
        const disappearingTransitions = [beachsection];
        const abs_fn = Math.abs;

        // remove the collapsed beach section from the beachline
        this.detachBeachsection(beachsection);

        // look left
        let lArc = previous;
        while (lArc.circleEvent && abs_fn(x - lArc.circleEvent.x) < 1e-9 && abs_fn(y - lArc.circleEvent.ycenter) < 1e-9) {
            previous = lArc.rbPrevious;
            disappearingTransitions.unshift(lArc);
            this.detachBeachsection(lArc);
            lArc = previous;
        }

        // add the leftmost arc
        disappearingTransitions.unshift(lArc);
        this.detachCircleEvent(lArc);

        // look right
        let rArc = next;
        while (rArc.circleEvent && abs_fn(x - rArc.circleEvent.x) < 1e-9 && abs_fn(y - rArc.circleEvent.ycenter) < 1e-9) {
            next = rArc.rbNext;
            disappearingTransitions.push(rArc);
            this.detachBeachsection(rArc);
            rArc = next;
        }

        // add the rightmost arc
        disappearingTransitions.push(rArc);
        this.detachCircleEvent(rArc);

        // set the start point for edges between disappearing transitions
        const nArcs = disappearingTransitions.length;
        for (let iArc = 1; iArc < nArcs; iArc++) {
            rArc = disappearingTransitions[iArc];
            lArc = disappearingTransitions[iArc - 1];
            rArc.edge.setEdgeStartpoint(lArc.site, rArc.site, vertex);
        }

        // create a new edge between leftmost and rightmost arcs
        lArc = disappearingTransitions[0];
        rArc = disappearingTransitions[nArcs - 1];
        rArc.edge = this.createEdge(lArc.site, rArc.site, undefined, vertex);

        // check for circle events
        this.attachCircleEvent(lArc);
        this.attachCircleEvent(rArc);
    }

    addBeachsection(site) {
        const x = site.x, directrix = site.y;
        let lArc, rArc, dxl, dxr;

        let node = this.beachline.root;
        while (node) {
            dxl = this.leftBreakPoint(node, directrix) - x;
            if (dxl > 1e-9) {
                node = node.rbLeft; // move left if x falls before the left edge
            } else {
                dxr = x - this.rightBreakPoint(node, directrix);
                if (dxr > 1e-9) {
                    node = node.rbRight; // move right if x falls after the right edge
                } else {
                    if (dxl > -1e-9) {
                        lArc = node.rbPrevious;
                        rArc = node;
                    } else if (dxr > -1e-9) {
                        lArc = node;
                        rArc = node.rbNext;
                    } else {
                        lArc = rArc = node; // x falls within the existing arc
                    }
                    break;
                }
            }
        }

        const newArc = new Beachsection(site);
        this.beachline.Insert(lArc, newArc);

        // case 1: first beach section on the beachline
        if (!lArc && !rArc) {
            return;
        }

        // case 2: new section splits an existing section
        if (lArc === rArc) {
            this.detachCircleEvent(lArc); // invalidate circle event for the split arc
            rArc = new Beachsection(lArc.site); // duplicate the split arc
            this.beachline.Insert(newArc, rArc);

            // create a new edge between the two new transitions
            newArc.edge = rArc.edge = this.createEdge(lArc.site, newArc.site);

            // check for collapsing arcs and create circle events
            this.attachCircleEvent(lArc);
            this.attachCircleEvent(rArc);
            return;
        }

        // case 3: new section is the last one on the beachline
        if (lArc && !rArc) {
            newArc.edge = this.createEdge(lArc.site, newArc.site);
            return;
        }

        // case 4: new section falls exactly between two existing sections
        if (lArc !== rArc) {
            this.detachCircleEvent(lArc);
            this.detachCircleEvent(rArc);

            // calculate the new vertex where the old transition disappears
            const lSite = lArc.site;
            const ax = lSite.x, ay = lSite.y;
            const bx = site.x - ax, by = site.y - ay;
            const rSite = rArc.site;
            const cx = rSite.x - ax, cy = rSite.y - ay;

            const d = 2 * (bx * cy - by * cx); // determinant
            const hb = bx * bx + by * by;
            const hc = cx * cx + cy * cy;
            const vertex = this.createVertex(
                (cy * hb - by * hc) / d + ax,
                (bx * hc - cx * hb) / d + ay
            );

            // create new edges at the vertex
            rArc.edge.setEdgeStartpoint(lSite, rSite, vertex);
            newArc.edge = this.createEdge(lSite, site, undefined, vertex);
            rArc.edge = this.createEdge(site, rSite, undefined, vertex);

            // check for potential circle events for the neighboring arcs
            this.attachCircleEvent(lArc);
            this.attachCircleEvent(rArc);
        }
    }

    attachCircleEvent(arc) {
        if (!arc.rbPrevious || !arc.rbNext) return; // exit early if no valid neighbors exist

        const lSite = arc.rbPrevious.site;
        const cSite = arc.site;
        const rSite = arc.rbNext.site;

        if (lSite === rSite) return; // skip if left and right sites are identical (no valid circle)

        // center site
        const bx = cSite.x;
        const by = cSite.y;

        // offsets:
        const ax = lSite.x - bx;
        const ay = lSite.y - by;
        const cx = rSite.x - bx;
        const cy = rSite.y - by;

        const d = 2 * (ax * cy - ay * cx); // determinant

        if (d >= -2e-12 || d === 0) return; // skip if l -> c -> r aren't counterclockwise

        // squared distances:
        const ha = ax * ax + ay * ay; // left to center
        const hc = cx * cx + cy * cy; // right to center

        // offsets
        const x = (cy * ha - ay * hc) / d;
        const y = (ax * hc - cx * ha) / d;
        const yCenter = y + by; // absolute y-coordinate of center

        const circleEvent = new CircleEvent();
        circleEvent.arc = arc;
        circleEvent.site = cSite;
        circleEvent.x = x + bx; // absolute x-coordinate
        circleEvent.y = yCenter + Math.sqrt(x * x + y * y); // bottom of the circle
        circleEvent.ycenter = yCenter;

        // attach to the arc
        arc.circleEvent = circleEvent;

        // find the insertion point
        let node = this.circleEvents.root, predecessor = null;
        while (node) {
            if (circleEvent.y < node.y || (circleEvent.y === node.y && circleEvent.x <= node.x)) {
                if (node.rbLeft) node = node.rbLeft;
                else { predecessor = node.rbPrevious; break; }
            } else {
                if (node.rbRight) node = node.rbRight;
                else { predecessor = node; break; }
            }
        }
        this.circleEvents.Insert(predecessor, circleEvent);
        if (!predecessor) this.firstCircleEvent = circleEvent;
    }

    detachCircleEvent(arc) {
        if (arc.circleEvent) {
            if (!arc.circleEvent.rbPrevious) {
                this.firstCircleEvent = arc.circleEvent.rbNext;
            }
            this.circleEvents.Remove(arc.circleEvent);
            arc.circleEvent = null;
        }
    }

    connectEdge(edge, bbox) {
        if (edge.vb) return true; // endpoint is already connected

        const startVertex = edge.va;
        const { xl: left, xr: right, yt: top, yb: bottom } = bbox;
        const { x: leftX, y: leftY } = edge.lSite;
        const { x: rightX, y: rightY } = edge.rSite;

        // midpoints
        const midX = (leftX + rightX) / 2;
        const midY = (leftY + rightY) / 2;

        // mark the cells as needing to be closed
        this.cells[edge.lSite.voronoiId].closeMe = true;
        this.cells[edge.rSite.voronoiId].closeMe = true;

        // if the perp. bisector is vertical
        if (this.eqEps(rightY, leftY)) {
            if (midX < left || midX >= right) return false; // outside bounding box

            if (leftX > rightX) { // bisector direction is downward
                if (!startVertex || startVertex.y < top) edge.va = this.createVertex(midX, top);
                else if (startVertex.y >= bottom) return false;
                edge.vb = this.createVertex(midX, bottom);
            } else { // bisector direction is upward
                if (!startVertex || startVertex.y > bottom) edge.va = this.createVertex(midX, bottom);
                else if (startVertex.y < top) return false;
                edge.vb = this.createVertex(midX, top);
            }
        } else { // slope is defined

            // perpendicular bisector:
            let slope = (leftX - rightX) / (rightY - leftY);
            let intercept = midY - slope * midX;

            // if the bisector has a steep slope, then connect to top/bottom
            if (slope < -1 || slope > 1) {
                if (leftX > rightX) { // downward
                    if (!startVertex || startVertex.y < top) edge.va = this.createVertex((top - intercept) / slope, top);
                    else if (startVertex.y >= bottom) return false;
                    edge.vb = this.createVertex((bottom - intercept) / slope, bottom);
                } else { // upward
                    if (!startVertex || startVertex.y > bottom) edge.va = this.createVertex((bottom - intercept) / slope, bottom);
                    else if (startVertex.y < top) return false;
                    edge.vb = this.createVertex((top - intercept) / slope, top);
                }
            } else { // if the bisector has a more shallow slope, then connect to left/right
                if (leftY < rightY) { // rightward
                    if (!startVertex || startVertex.x < left) edge.va = this.createVertex(left, slope * left + intercept);
                    else if (startVertex.x >= right) return false;
                    edge.vb = this.createVertex(right, slope * right + intercept);
                } else { // leftward
                    if (!startVertex || startVertex.x > right) edge.va = this.createVertex(right, slope * right + intercept);
                    else if (startVertex.x < left) return false;
                    edge.vb = this.createVertex(left, slope * left + intercept);
                }
            }
        }

        return true;
    }

    clipEdge(edge, bbox) {
        const ax = edge.va.x, ay = edge.va.y; // start
        const bx = edge.vb.x, by = edge.vb.y; // end

        let t0 = 0, t1 = 1;
        const dx = bx - ax; // change in x direction
        const dy = by - ay; // change in y direction
        let q, r;

        // check left boundary
        q = ax - bbox.xl; // distance of ax from left boundary
        if (dx === 0 && q < 0) return false; // edge is parallel and outside
        r = -q / dx; // calculate intersection factor
        if (dx < 0) { // edge goes leftward
            if (r < t0) return false; // fully outside
            if (r < t1) t1 = r; // clip end point
        } else if (dx > 0) { // edge goes rightward
            if (r > t1) return false; // fully outside
            if (r > t0) t0 = r; // clip start point
        }

        // check right boundary
        q = bbox.xr - ax;
        if (dx === 0 && q < 0) return false;
        r = q / dx;
        if (dx < 0) { // edge goes leftward
            if (r > t1) return false;
            if (r > t0) t0 = r;
        } else if (dx > 0) { // edge goes rightward
            if (r < t0) return false;
            if (r < t1) t1 = r;
        }

        // check top boundary
        q = ay - bbox.yt;
        if (dy === 0 && q < 0) return false; // edge is parallel and outside
        r = -q / dy;
        if (dy < 0) { // edge goes upward
            if (r < t0) return false;
            if (r < t1) t1 = r;
        } else if (dy > 0) { // edge goes downward
            if (r > t1) return false;
            if (r > t0) t0 = r;
        }

        // check bottom boundary
        q = bbox.yb - ay;
        if (dy === 0 && q < 0) return false;
        r = q / dy;
        if (dy < 0) { // edge goes upward
            if (r > t1) return false;
            if (r > t0) t0 = r;
        } else if (dy > 0) { // edge goes downward
            if (r < t0) return false;
            if (r < t1) t1 = r;
        }

        if (t0 > 0) {
            edge.va = this.createVertex(ax + t0 * dx, ay + t0 * dy);
        }

        if (t1 < 1) {
            edge.vb = this.createVertex(ax + t1 * dx, ay + t1 * dy);
        }

        // mark cells to close if vertices were clipped
        if (t0 > 0 || t1 < 1) {
            this.cells[edge.lSite.voronoiId].closeMe = true;
            this.cells[edge.rSite.voronoiId].closeMe = true;
        }

        return true;
    }

    clipEdges(bbox) {
        const edges = this.edges;
        let iEdge = edges.length;

        // iterate backward so we can splice safely
        while (iEdge--) {
            let edge = edges[iEdge]; // edge is removed if it's outside the bounding box or if it's close to zero length

            // check if edge is invalid:
            if (!this.connectEdge(edge, bbox) || // cannot connect to bounding box
                    !this.clipEdge(edge, bbox) || // cannot clip within bounding box
                    (this.eqEps(edge.va.x, edge.vb.x) && this.eqEps(edge.va.y, edge.vb.y))) { // edge is degenerate (very small or zero length)

                edge.va = edge.vb = null;
                edges.splice(iEdge, 1);
            }
        }
    }

    closeCells(bbox) {
        const xl = bbox.xl, xr = bbox.xr, yt = bbox.yt, yb = bbox.yb;
        let edge, va, vb, vz, lastBorderSegment;

        for (let iCell = this.cells.length - 1; iCell >= 0; iCell--) {
            const cell = this.cells[iCell];

            // prepare halfedges: prune, order counterclockwise


            if (!cell.prepareHalfedges() || !cell.closeMe)  continue; // skip if cell is already closed or invalid

            let halfedges = cell.halfedges;
            let nHalfedges = halfedges.length;

            // all other cases
            for (let iLeft = 0; iLeft < nHalfedges; iLeft++) {
                va = halfedges[iLeft].getEndpoint();
                vz = halfedges[(iLeft + 1) % nHalfedges].getStartpoint();

                // check if the endpoint (va) matches the startpoint (vz)
                if (this.neqEps(va.x, vz.x) || this.eqEps(va.y, vz.y)) {
                    let continue_switch = true;

                    // walk downward along the left side of the bounding box
                    if (this.eqEps(va.x, xl) && this.ltEps(va.y, yb)) {
                        lastBorderSegment = this.eqEps(vz.x, xl);
                        vb = this.createVertex(xl, lastBorderSegment ? vz.y : yb);
                        edge = this.createBorderEdge(cell.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                        nHalfedges++;
                        if (!lastBorderSegment) {
                            va = vb;
                        } else {
                            continue_switch = false;
                        }
                    }

                    // walk rightward along the bottom side
                    if (continue_switch && (this.eqEps(va.y, yb) && this.ltEps(va.x, xr))) {
                        lastBorderSegment = this.eqEps(vz.y, yb);
                        vb = this.createVertex(lastBorderSegment ? vz.x : xr, yb);
                        edge = this.createBorderEdge(cell.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                        nHalfedges++;
                        if (!lastBorderSegment) {
                            va = vb;
                        } else {
                            continue_switch = false;
                        }
                    }

                    // walk upward along the right side of the bounding box
                    if (continue_switch && (this.eqEps(va.x, xr) && this.gtEps(va.y, yt))) {
                        lastBorderSegment = this.eqEps(vz.x, xr);
                        vb = this.createVertex(xr, lastBorderSegment ? vz.y : yt);
                        edge = this.createBorderEdge(cell.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                        nHalfedges++;
                        if (!lastBorderSegment) {
                            va = vb;
                        } else {
                            continue_switch = false;
                        }
                    }

                    // walk left along the top side of the bounding box
                    if (continue_switch && (this.eqEps(va.y, yt) && this.gtEps(va.x, xl))) {
                        lastBorderSegment = this.eqEps(vz.y, yt);
                        vb = this.createVertex(lastBorderSegment ? vz.x : xl, yt);
                        edge = this.createBorderEdge(cell.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                        nHalfedges++;
                        if (!lastBorderSegment) {
                            va = vb;

                            // walk downward along left side
                            lastBorderSegment = this.eqEps(vz.x, xl);
                            vb = this.createVertex(xl, lastBorderSegment ? vz.y : yb);
                            edge = this.createBorderEdge(cell.site, va, vb);
                            iLeft++;
                            halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                            nHalfedges++;
                            if (!lastBorderSegment) {
                                va = vb;

                                // walk rightward along bottom side
                                lastBorderSegment = this.eqEps(vz.y, yb);
                                vb = this.createVertex(lastBorderSegment ? vz.x : xr, yb);
                                edge = this.createBorderEdge(cell.site, va, vb);
                                iLeft++;
                                halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                                nHalfedges++;
                                if (!lastBorderSegment) {
                                    va = vb;

                                    // walk upward along right side
                                    lastBorderSegment = this.eqEps(vz.x, xr);
                                    vb = this.createVertex(xr, lastBorderSegment ? vz.y : yt);
                                    edge = this.createBorderEdge(cell.site, va, vb);
                                    iLeft++;
                                    halfedges.splice(iLeft, 0, new Halfedge(edge, cell.site, null));
                                    nHalfedges++;
                                    if (!lastBorderSegment) {
                                        throw "Voronoi.closeCells() > this makes no sense!";
                                    }
                                }
                            }
                        }
                    }
                }
            }
            cell.closeMe = false;
        }
    }

    compute(sites, bbox) {
        // reset internal state
        this.reset();

        sites = sites.map(site => new Vertex(site.x, site.y));

        // initialize site event queue (sorted top-to-bottom, left-to-right)
        const siteEvents = sites.slice(0);
        siteEvents.sort((a, b) => {
            const diffY = b.y - a.y; // sort by descending y-coordinate
            return diffY || (b.x - a.x); // tie-breaker: descending x-coordinate
        });

        let site = siteEvents.pop(); // get the first site (bottom-most)
        let siteid = 0; // unique id for each site
        let xsitex, xsitey; // to track duplicate site coordinates
        let cells = this.cells; // store cells created for each site
        let step_i = -1; // iteration step count for debugging/tracking

        // process site and circle events
        for (; ;) {
            step_i++;

            // get the first circle event (smallest in the queue)
            let circle = this.firstCircleEvent;

            // process site event (if it's earlier than the circle event)
            if (site && (!circle || site.y < circle.y || (site.y === circle.y && site.x < circle.x))) {
                // add a beach section only if the site is not a duplicate
                if (site.x !== xsitex || site.y !== xsitey) {
                    // create a cell for the new site
                    cells[siteid] = new Cell(site);
                    site.voronoiId = siteid++;

                    // create a beach section for the site
                    this.addBeachsection(site);

                    // update last site coordinates to detect duplicates
                    xsitey = site.y;
                    xsitex = site.x;
                }

                // move to the next site in the queue
                site = siteEvents.pop();
            } else if (circle) { // process circle event (remove collapsing beach section)
                this.removeBeachsection(circle.arc);
            } else { // no more events to process
                break;
            }
        }

        // post-processing:
        // 1. connect dangling edges to the bounding box
        // 2. clip edges to fit within the bounding box
        // 3. discard edges completely outside the bounding box
        // 4. remove edges that are reduced to points
        this.clipEdges(bbox);

        // close open cells by adding missing edges
        this.closeCells(bbox);

        // create and populate the result diagram
        const diagram = new Diagram();
        diagram.edges = this.edges.map(edge => edge.copy());
        diagram.i = step_i;

        // clean up internal state
        this.reset();

        return diagram; // return the final Voronoi diagram
    }


    compute2(sites, bbox) {
        // reset internal state
        this.reset();

        const siteEvents = sites.map(site => new Vertex(site.x, site.y)).slice(0);

        siteEvents.sort((a, b) => {
            const diffY = b.y - a.y; // sort by descending y-coordinate
            return diffY || (b.x - a.x); // tie-breaker: descending x-coordinate
        });

        let site = siteEvents.pop(); // get the first site (bottom-most)
        let siteid = 0; // unique id for each site
        let xsitex, xsitey; // to track duplicate site coordinates
        let cells = this.cells; // store cells created for each site
        let step_i = -1; // iteration step count for debugging/tracking

        let results = [];
        let lastSite = site;


        // process site and circle events
        for (; ;) {
            step_i++;

            // get the first circle event (smallest in the queue)
            let circle = this.firstCircleEvent;

            // process site event (if it's earlier than the circle event)
            if (site && (!circle || site.y < circle.y || (site.y === circle.y && site.x < circle.x))) {
                let description = `Step ${step_i}: Processing site event at (${Math.round(site.x)}, ${Math.round(site.y)}).\n`;


                // add a beach section only if the site is not a duplicate
                if (site.x !== xsitex || site.y !== xsitey) {

                    description += `Added beach section for this site.`;

                    // create a cell for the new site
                    cells[siteid] = new Cell(site);
                    site.voronoiId = siteid++;

                    // create a beach section for the site
                    this.addBeachsection(site);

                    // update last site coordinates to detect duplicates
                    xsitey = site.y;
                    xsitex = site.x;
                } else {
                    description += `: Duplicate site, ignored.`;
                }

                results.push({
                    step: step_i,
                    sweepLine: site.y,
                    circles: this.getActiveCircleEvents(),
                    edges: this.edges.map(edge => edge.copy()),
                    description: description,
                });

                lastSite = site;

                // move to the next site in the queue
                site = siteEvents.pop();
            } else if (circle) { // process circle event (remove collapsing beach section)
                let description = `Step ${step_i}: Circle event detected at (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}).\n`;
                description += `Removed collapsing beach section associated with site (${circle.arc.site.x.toFixed(2)}, ${circle.arc.site.y.toFixed(2)}).`;

                // let description = `Processing circle event at (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)})`;
                // description += `: Removed beach section for arc ${circle.arc.site.voronoiId}`;

                this.removeBeachsection(circle.arc);
                results.push({
                    step: step_i,
                    sweepLine: site? site.y : lastSite.y,
                    circles: this.getActiveCircleEvents(),
                    edges: this.edges.map(edge => edge.copy()),
                    description: description,
                });

            } else { // no more events to process
                break;
            }
        }

        // post-processing:
        // 1. connect dangling edges to the bounding box
        // 2. clip edges to fit within the bounding box
        // 3. discard edges completely outside the bounding box
        // 4. remove edges that are reduced to points
        this.clipEdges(bbox);

        // close open cells by adding missing edges
        this.closeCells(bbox);

        results.push({
            step: step_i,
            sweepLine: lastSite.y,
            circles: this.getActiveCircleEvents(),
            edges: this.edges.map(edge => edge.copy()),
            description: `Final step: Edges clipped and cells closed.`
        });

        results.forEach((r) => {
            r.edges = this.computeStepByStep(sites, bbox, step.step).edges;
        });



        return rr; // return the final Voronoi diagram
    }

    computeAllSteps(sites, bbox) {
        let step = -1;
        let results = [];
        let result;

        do {
            step++;
            result = this.computeStep(sites, bbox, step);
            results.push(result);
        } while (!result.done);

        return results;
    }

    computeStep(sites, bbox, step) {
        // reset internal state
        this.reset();

        const siteEvents = sites.map(site => new Vertex(site.x, site.y)).slice(0);

        siteEvents.sort((a, b) => {
            const diffY = b.y - a.y; // sort by descending y-coordinate
            return diffY || (b.x - a.x); // tie-breaker: descending x-coordinate
        });

        let site = siteEvents.pop(); // get the first site (bottom-most)
        let siteid = 0; // unique id for each site
        let xsitex, xsitey; // to track duplicate site coordinates
        let cells = this.cells; // store cells created for each site
        let step_i = -1; // iteration step count for debugging/tracking
        let lastSite = site;

        let sweepLine = -1;
        let circles = [];
        let description = '';
        let done = false;


        // process site and circle events
        while (step_i < step) {

            // get the first circle event (smallest in the queue)
            let circle = this.firstCircleEvent;

            // process site event (if it's earlier than the circle event)
            if (site && (!circle || site.y < circle.y || (site.y === circle.y && site.x < circle.x))) {


                // add a beach section only if the site is not a duplicate
                if (site.x !== xsitex || site.y !== xsitey) {


                    description = `Step ${step_i}: Processing site event at (${Math.round(site.x)}, ${Math.round(site.y)}).\n`;
                    description += `Added beach section for this site.`;

                    // create a cell for the new site
                    cells[siteid] = new Cell(site);
                    site.voronoiId = siteid++;

                    // create a beach section for the site
                    this.addBeachsection(site);

                    // update last site coordinates to detect duplicates
                    xsitey = site.y;
                    xsitex = site.x;


                    sweepLine = site.y;
                    circles = this.getActiveCircleEvents();
                    step_i++;
                }

                lastSite = site;

                // move to the next site in the queue
                site = siteEvents.pop();
            } else if (circle) { // process circle event (remove collapsing beach section)
                this.removeBeachsection(circle.arc);
                sweepLine = site? site.y : lastSite.y;
                circles = this.getActiveCircleEvents();
                description = `Step ${step_i}: Circle event detected at (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}).\n`;
                description += `Removed collapsing beach section associated with site (${circle.arc.site.x.toFixed(2)}, ${circle.arc.site.y.toFixed(2)}).`;

                step_i++;
            } else { // no more events to process
                done = true;
                break;
            }
        }

        // post-processing:
        // 1. connect dangling edges to the bounding box
        // 2. clip edges to fit within the bounding box
        // 3. discard edges completely outside the bounding box
        // 4. remove edges that are reduced to points
        this.clipEdges(bbox);

        // close open cells by adding missing edges
        this.closeCells(bbox);


        let result = {
            step: step_i,
            sweepLine: sweepLine,
            circles: circles,
            edges: this.edges.map(edge => edge.copy()),
            description: !done ? description : `Final step: Edges clipped and cells closed.`,
            done: done,
        };


        this.reset();

        return result;
    }



    computeStepByStep(sites, bbox, step) {
        // init internal state
        this.reset();


        sites = sites.map(site => new Vertex(site.x, site.y));

        // Initialize site event queue
        var siteEvents = sites.slice(0);
        siteEvents.sort(function (a, b) {
            var r = b.y - a.y;
            if (r) {
                return r;
            }
            return b.x - a.x;
        });

        // process queue
        var site = siteEvents.pop(),
            siteid = 0,
            xsitex, // to avoid duplicate sites
            xsitey,
            cells = this.cells,
            circle;

        let i;

        // main loop
        for (i = 0; i < step; i++) {
            // we need to figure whether we handle a site or circle event
            // for this we find out if there is a site event and it is
            // 'earlier' than the circle event
            circle = this.firstCircleEvent;

            // add beach section
            if (site && (!circle || site.y < circle.y || (site.y === circle.y && site.x < circle.x))) {
                // only if site is not a duplicate
                if (site.x !== xsitex || site.y !== xsitey) {
                    // first create cell for new site
                    cells[siteid] = new Cell(site);
                    site.voronoiId = siteid++;
                    // then create a beachsection for that site
                    this.addBeachsection(site);
                    // remember last site coords to detect duplicate
                    xsitey = site.y;
                    xsitex = site.x;
                }
                site = siteEvents.pop();
            }

            // remove beach section
            else if (circle) {
                this.removeBeachsection(circle.arc);
            }

            // all done, quit
            else {
                break;
            }
        }

        // wrapping-up:
        //   connect dangling edges to bounding box
        //   cut edges as per bounding box
        //   discard edges completely outside bounding box
        //   discard edges which are point-like
        this.clipEdges(bbox);

        //   add missing edges in order to close opened cells
        this.closeCells(bbox);

        // prepare return values
        var diagram = new Diagram();
        diagram.edges = this.edges.map(edge => {return edge.copy();});
        diagram.i = i;
        diagram.beachline = site;
        if (diagram.beachline) {
            diagram.beachlineArcs = this.getBeachlineArcs(diagram.beachline);
            diagram.circleEvents = this.getActiveCircleEvents();
            diagram.sweepLine = site.y;
        }

        // clean up
        this.reset();

        return diagram;
    }

    getBeachlineArcs(beachline) {
        const beachlineArcs = [];
        let arc = this.beachline?.getLeftmost(this.beachline?.root);
        while (arc) {
            beachlineArcs.push({
                site: arc.site,
                leftBreakpoint: this.leftBreakPoint(arc, beachline.y),
                rightBreakpoint: this.rightBreakPoint(arc, beachline.y),
            });
            arc = arc.rbNext;
        }
        return beachlineArcs;
    }

    getActiveCircleEvents() {
        const circleEvents = [];
        let event = this.firstCircleEvent;
        while (event) {
            circleEvents.push({
                x: event.x,
                y: event.ycenter,
                radius: Math.sqrt((event.x - event.arc.site.x) ** 2 + (event.ycenter - event.arc.site.y) ** 2),
                // arc: event.arc,
            });
            event = event.rbNext;
        }
        return circleEvents;
    }

}