// const canvas = document.getElementById("main-canvas");
// const ctx = canvas.getContext("2d");

class Canvas {
  constructor(canvas, pointRadius = 5) {
    this.pointRadius = pointRadius;
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.bbox = { xl: 0, xr: this.canvas.width, yt: 0, yb: this.canvas.height };
    this.ctx = this.canvas.getContext("2d");
    this.voronoi = new Voronoi();
    this.results = [];
    this.steps = [];
    this.finalResult = null;
    this.points = [];
    this.step = -1;
    this.numSteps = 0;
    this.inAlgorithm = false;
    this.showBeachline = true;
    this.showCircles = true;
    this.smoothTransitions = true;
    this.animationSpeed = 1000;
    this.interruptedAnimation = false;
    this.isAutoPlaying = false;
  }

  SetIsInAlgorithm(isInAlgorithm) {
    this.inAlgorithm = isInAlgorithm;
    this.SetStep(-1);
    if (this.isAutoPlaying) {
      this.interruptedAnimation = true;
    }
    this.DrawCurrentState();
    this.updateAll();
  }

  SetIsAutoPlaying(isAutoPlaying) {
    this.isAutoPlaying = isAutoPlaying;
    this.updateAll();
  }

  SetStep(step) {
    this.step = step;
    this.UpdateStep();
    this.updateAll();
  }


  SetUpdateAllFunction(updateAllFunction) {
    this.updateAll = () => {
      updateAllFunction();
      this.UpdateTable();
      if (!this.inAlgorithm) {
        this.UpdateDescription();
      }
    }
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

  HandleResize() {
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    const newWidth = this.canvas.clientWidth
    const newHeight = this.canvas.clientHeight

    if (oldWidth !== newWidth || oldHeight !== newHeight) {
      this.canvas.width = newWidth;
      this.canvas.height = newHeight;
      this.bbox = { xl: 0, xr: this.canvas.width, yt: 0, yb: this.canvas.height };
      const wScale = newWidth / oldWidth;
      const hScale = newHeight / oldHeight;
      this.points.forEach(point => {
        point.x = point.x * wScale;
        point.y = point.y * hScale;
      });
      this.
      this.DrawCurrentState()
    }

  }

  GetPointAtPosition(x, y) {
    return this.points.find(point => {
      const dx = point.x - x;
      const dy = point.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= this.pointRadius;
    });
  }

  ClearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  ClearAllPoints() {
    this.points.length = 0;
    this.SetIsInAlgorithm(false);
    this.ComputeVoronoi()
    this.DrawCurrentState();
    this.UpdateTable();
    this.updateAll();
  }

  AddPoint(x, y, redraw = true) {
    const point = this.GetPointAtPosition(x, y);
    if (!point) {
      this.points.push({ x, y });
      this.UpdateTable();
      this.updateAll();
      console.log(`Added point at (${x}, ${y}).`);
      if (redraw) {
        this.ComputeVoronoi();
        this.DrawCurrentState();
      }
      return true;
    } else {
      return false;
    }
  }

  MovePoint(point, newX, newY) {
    if (!point) {
      return null;
    }
    let p = this.GetPointAtPosition(point.x, point.y);
    if (p) {
      let oldx = p.x;
      let oldy = p.y;
      p.x = this.GetBoundX(newX);
      p.y = this.GetBoundY(newY);
      if (oldx === p.x && oldy === p.y) {
        return p;
      }
      this.ComputeVoronoi()
      this.DrawCurrentState();
      return p;
    }
    return null;
  }

  AddRandomPoint() {
    this.AddRandomPoints(1);
  }

  findFurthestPoint() {
    let { xl, xr, yt, yb } = this.bbox;

    if (xr < xl) {
      [xl, xr] = [xl, xr];
    }
    if (yb < yt) {
      [yt, yb] = [yb, yt];
    }

    const xShift = Math.abs((xr - xl) / 10);
    const yShift = Math.abs((yb - yt) / 10);

    xl += xShift;
    xr -= xShift;
    yt += yShift;
    yb -= yShift;


    const stepSizeX = Math.abs((xr - xl) / 15);
    const stepSizeY = Math.abs((yb - yt) / 20);


    let bestPoint = null;
    let maxMinDistance = -Infinity;

    // Helper function to compute Euclidean distance
    const distance = (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

    // Iterate over grid points inside the bbox
    for (let x = xl; x <= xr; x += stepSizeX) {
      for (let y = yt; y <= yb; y += stepSizeY) {
        let minDistance = Infinity;

        // Find the minimum distance from this candidate point to all other points
        for (const point of this.points) {
          const dist = distance(x, y, point.x, point.y);
          if (dist < minDistance) {
            minDistance = dist;
          }
        }

        // Update the best point if this has a larger minimum distance
        if (minDistance > maxMinDistance) {
          maxMinDistance = minDistance;
          bestPoint = { x, y };
        }
      }
    }

    if (this.points.length < 20 || Math.random() < 0.4) {
      bestPoint.x += ((Math.random() - 0.5) * 1.8 * xShift);
      bestPoint.y += ((Math.random() - 0.5) * 1.8 * yShift);
    }

    return bestPoint;
  }

  AddRandomPoints(numPoints = 1) {
    for (let i = 0; i < numPoints; i++) {
      let p = this.findFurthestPoint();
      if (p) {
          this.AddPoint(p.x, p.y, false);
      } else {
        while (true) {
          const x = Math.random() * this.canvas.width;
          const y = Math.random() * this.canvas.height;
          if (this.AddPoint(x, y, true)) {
            break;
          }
        }
      }
    }
    this.ComputeVoronoi()
    this.DrawCurrentState();
  }

  ComputeVoronoi() {
    this.results.length = 0;
    this.finalResult = null;
    this.numSteps = 0;
    this.SetStep(-1);
    if (this.points.length > 1) {
      console.log("Computing Voronoi diagram.")


      this.steps = this.voronoi.computeAllSteps(this.points, this.bbox);
      this.steps.sort((a, b) => a.step - b.step);
      this.numSteps = Math.max(...this.steps.map(step => step.step)) + 1;
      this.steps.unshift({
        step: -1,
        sweepLine: Math.min(this.bbox.yt, this.bbox.yb),
        circles: [],
        edges: [],
        description: "Initial start of the algorithm.",
      });
      let lastStep = this.steps[this.steps.length - 1];
      this.steps.push({
        step: this.numSteps,
        sweepLine: Math.max(this.bbox.yt, this.bbox.yb),
        circles: [],
        edges: lastStep.edges,
        description: "Final state of the algorithm.",
      });

      this.finalResult = this.steps[this.steps.length - 1];
    } else {
      console.log("Not enough points to compute Voronoi diagram.");
    }
  }

  GetCurrentResult() {
    if (this.inAlgorithm) {
      return this.GetResultAtStep(this.step);
    } else {
      return this.finalResult;
    }
  }

  GetResultAtStep(step) {
    if (!this.inAlgorithm) {
      return this.finalResult;
    }
    return this.steps?.find(s => {
        return s.step === step;
    });
  }

  DrawPoint(point, outlineColor = "black", fillColor = "blue") {
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.pointRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = outlineColor;
    this.ctx.lineWidth = 2; // Set the line width
    this.ctx.fill();
    this.ctx.stroke();
  }

  ToggleSmoothTransitions() {
    this.smoothTransitions = !this.smoothTransitions;
  }

  IsInAlgorithm() {
    return this.inAlgorithm;
  }

  GetSweepline() {
    if (this.inAlgorithm) {
      return this.GetCurrentResult()?.sweepLine ?? -1;
    } else {
      return -1;
    }
  }

  ToggleInAlgorithm() {
    this.SetIsInAlgorithm(!this.inAlgorithm);
  }

  DrawPoints() {
    if ((this.points?.length ?? 0) <= 1) {
      this.points.forEach(point => {
        this.DrawPoint(point)
      });
      return;
    }

    let sweepLine = this.GetSweepline();

    this.points.forEach(point => {
      if (this.inAlgorithm) {
        this.DrawPoint(point, "black", point.y > sweepLine ? "white" : point.y < sweepLine ? "blue" : "red");
      } else {
        this.DrawPoint(point);
      }
    });
  }

  DrawEdge(edge) {
    if (!edge || !edge.va || !edge.vb) {
      return;
    }
    let isFinalEdge = this.finalResult?.edges?.find(e => {
      return this.eqEps(e.va.x, edge.va.x) && this.eqEps(e.va.y, edge.va.y) && this.eqEps(e.vb.x, edge.vb.x) && this.eqEps(e.vb.y, edge.vb.y);
    }) ?? false

    this.ctx.beginPath();
    this.ctx.moveTo(edge.vb.x, edge.vb.y);
    this.ctx.lineTo(edge.va.x, edge.va.y);
    this.ctx.strokeStyle = isFinalEdge ? "black" : "grey" // Edge color
    this.ctx.lineWidth = isFinalEdge ? 2 : 1; // Set the line width
    this.ctx.stroke();
  }

  DrawEdges(step = -1) {
    if (step === -1) {
      step = this.step;
    }
    this.GetResultAtStep(step)?.edges?.forEach(edge => {
      this.DrawEdge(edge)
    });
  }

  DrawHorizontalLine(y, color) {
    if (y) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  GetBoundX(xValue) {
    if (this.bbox.xl < this.bbox.xr) {
        return Math.min(Math.max(xValue, this.bbox.xl), this.bbox.xr);
    } else {
        return Math.min(Math.max(xValue, this.bbox.xr), this.bbox.xl);
    }
  }

  GetBoundY(yValue) {
    if (this.bbox.yt < this.bbox.yb) {
        return Math.min(Math.max(yValue, this.bbox.yt), this.bbox.yb);
    } else {
        return Math.min(Math.max(yValue, this.bbox.yb), this.bbox.yt);
    }
  }

  DrawSweepLine() {
    if (this.inAlgorithm) {
      this.DrawHorizontalLine(this.GetCurrentResult()?.sweepLine, "red");
    }
  }

  DrawBeachLines(sweepLine = -1, fillColor = "rgba(0, 0, 255, 0.2)") {
    if (this.showBeachline && this.inAlgorithm) {
      if (sweepLine === -1) {
        sweepLine = this.GetSweepline();
      }
      if (sweepLine !== -1) {
        let sites = this.points.filter(point => point.y < sweepLine);
        let left = Math.min(this.bbox.xl, this.bbox.xr);
        let right = Math.max(this.bbox.xl, this.bbox.xr);
        let step = (Math.abs(left - right)) / 1000;

        this.ctx.beginPath(); // Start path

        // Move to the top-left corner of the bounding box
        this.ctx.moveTo(left, Math.min(this.bbox.yt, this.bbox.yb));

        // Draw the parabola curve
        for (let x = left; x <= right; x += step) {
          let y = Math.max(...sites.map(site => {
            let h = site.x;
            let k = site.y;
            let d = sweepLine;
            return ((x - h) ** 2) / (2 * (k - d)) + (k + d) / 2;
          }));

          // Draw the curve but only within the bounding box
          if (y < Math.max(this.bbox.yt, this.bbox.yb) && y > Math.min(this.bbox.yt, this.bbox.yb)) {
            this.ctx.lineTo(x, y);
          }
        }

        // Close the path upwards to the top boundary
        this.ctx.lineTo(right, Math.min(this.bbox.yt, this.bbox.yb)); // Top-right corner
        this.ctx.lineTo(left, Math.min(this.bbox.yt, this.bbox.yb));  // Back to top-left corner

        // Set fill style and fill the area above the parabola
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        // Stroke the beach line curve
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 0;
        this.ctx.stroke();

        this.ctx.closePath();

        let first = false;
        this.ctx.beginPath();

        for (let x = left; x <= right; x += step) {
          let y = Math.max(...sites.map(site => {
            let h = site.x;
            let k = site.y;
            let d = sweepLine;
            return ((x - h) ** 2) / (2 * (k - d)) + (k + d) / 2;
          }))


          if (y < Math.max(this.bbox.yt, this.bbox.yb) && y > Math.min(this.bbox.yt, this.bbox.yb)) {
            if (first) {
              this.ctx.lineTo(x, y);
            } else {
              first = true;
            }
            this.ctx.moveTo(x, y);
            this.ctx.strokeStyle = "blue";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
          }

        }
      }
    }
  }

  DrawCircle(circleEvent, lineColor = "purple", centerColor = "red") {
    let x = circleEvent.x;
    let y = circleEvent.y;
    let r = circleEvent.radius;

    // Set drawing properties
    this.ctx.beginPath(); // Begin a new path
    this.ctx.arc(x, y, r, 0, 2 * Math.PI); // Draw the circle
    this.ctx.strokeStyle = lineColor; // Set the circle color
    this.ctx.lineWidth = 1; // Set the line width
    this.ctx.stroke(); // Draw the stroke of the circle

    // Optionally label or indicate the center point of the circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, 2 * Math.PI); // Draw a small dot at the center
    this.ctx.fillStyle = centerColor; // Center point color
    this.ctx.fill(); // Fill the center point

  }

  DrawCircleEvents() {
    if (this.showCircles && this.inAlgorithm) {
      this.GetCurrentResult().circles?.forEach(circleEvent => {
        this.DrawCircle(circleEvent);
      });
    }
  }

  NextTransition(smooth = true, autoPlay = false) {
    return this.Transition(smooth, false, autoPlay);
  }

  PreviousTransition(smooth = true, autoPlay = false) {
    return this.Transition(smooth, true, autoPlay);
  }

  SkipTransition(skip) {
    if (this.interruptedAnimation) {
        return;
    }
    this.interruptedAnimation = true;
    for (let i = 0; i < Math.abs(skip); i++) {
        if (skip > 0) {
            if (!this.NextTransition(false)) {
              break;
            }
        } else {
            if (!this.PreviousTransition(false)) {
              break;
            }
        }
    }
    this.interruptedAnimation = false;
  }

  ToggleShowBeachline() {
    this.showBeachline = !this.showBeachline;
    if (this.inAlgorithm) {
      this.DrawCurrentState();
    }
  }

  ToggleShowCircles() {
    this.showCircles = !this.showCircles;
    if (this.inAlgorithm) {
      this.DrawCurrentState();
    }
  }

  PauseAutoPlay() {
    if (this.isAutoPlaying) {
      this.interruptedAnimation = true;
    }
  }

  UpdateTable() {
    //console.log("Updating points table...");
    const tableBody = document.getElementById("points-table").querySelector("tbody");
    tableBody.innerHTML = "";
    this.points.sort((a, b) => {return a.y - b.y}).forEach((point, index) => {
      const row = document.createElement("tr");
      let sl = (this.inAlgorithm && this.points.length > 1 && this.step >= 0 && this.GetCurrentResult()) ? this.GetCurrentResult().sweepLine : Infinity;
      let color = point.y < sl ? "blue" : this.eqEps(point.y, sl) ? "red" : "black";
      let colorText = (text) => `<span style="color: ${color};">${text}</span>`;
      row.innerHTML = `<td>${colorText(index + 1)}</td><td>${colorText(Math.round(point.x))}</td><td>${colorText(Math.round(point.y))}</td>`;
      tableBody.appendChild(row);
    });
    document.getElementById("n").innerText = `${this.points.length}`;
  }

  Transition(smooth = true, previous = false, autoPlay = false) {

    if (!this.inAlgorithm) {
      return false;
    }
    if ((this.points?.length ?? 0) < 2 || this.steps.length <= 1) {
        return false;
    }

    let lastStep = this.step;
    let currentStep = this.step + (previous ? -1 : 1);

    if (currentStep <= -2 || lastStep <= -2 || currentStep > this.numSteps || lastStep > this.numSteps) {
      if (autoPlay) {
        this.SetIsAutoPlaying(false);
        this.interruptedAnimation = false;
      }
      this.ToggleInAlgorithm();
      this.SetStep(-1);
      this.DrawCurrentState();
      return false;
    }


    if (autoPlay) {
      if (this.interruptedAnimation) {
        this.interruptedAnimation = false;
        this.SetIsAutoPlaying(false);
        return;
      }
      this.SetIsAutoPlaying(true);
    }

    let lastResult = this.GetResultAtStep(lastStep);
    let currentResult = this.GetResultAtStep(currentStep);

    let lastSweepLine = lastResult.sweepLine;
    let currentSweepLine = currentResult.sweepLine;


    this.SetStep(currentStep);
    this.UpdateDescription(currentResult.description ?? "");


    if (autoPlay || (smooth && this.smoothTransitions)) {

      if (lastSweepLine !== currentSweepLine) {

          let valuesOfI = [];

          let step = (previous ? -1 : 1) * Math.abs(this.bbox.yt - this.bbox.yb) / this.animationSpeed; // Math.max(0.3, Math.abs((currentSweepLine - lastSweepLine) / this.animationSpeed));

          for (let i = lastSweepLine; previous ? i > currentSweepLine : i <= currentSweepLine; i += step) {
            valuesOfI.push(i);
          }

          this.AnimateSweeplineAndBeachlines(valuesOfI, 0, autoPlay);
          return;

      } else if (autoPlay) {
        requestAnimationFrame(() => this.NextTransition(true, true));
        return;
      }
    }
    this.DrawCurrentState();
  }

  GetStep() {
    return this.step;
  }

  DrawCurrentState() {
    this.ClearCanvas();
    this.DrawEdges();
    this.DrawBeachLines();
    this.DrawCircleEvents();
    this.DrawSweepLine();
    this.DrawPoints();
    this.UpdateSweepLine(this.GetCurrentResult()?.sweepLine ?? Math.min(this.bbox.yt, this.bbox.yb));
  }

  UpdateSpeed(speed) {
    this.animationSpeed = 1000 / speed;
  }

  UpdateSweepLine(y) {
    document.getElementById("sweep-line").innerText = `y = ${Math.round(y)}`;
  }

  UpdateStep() {
    if (this.step >= 0) {
      document.getElementById("i-num").innerText = `${Math.round(this.step) + 1} of ${this.numSteps + 1}`;
    } else {
        document.getElementById("i-num").innerText = "";
    }
    this.UpdateArcs();
    this.UpdateEdges();
  }

  UpdateArcs() {
    document.getElementById("arcs").innerText = `${this.GetCurrentResult()?.circles?.length ?? 0}`;
  }

  UpdateEdges() {
    let numEdges = this.GetCurrentResult()?.edges?.filter(
        (edge) => {
            return edge.va && edge.vb && edge.va.x !== edge.vb.x && edge.va.y !== edge.vb.y;
        }
    )?.length ?? 0;
    document.getElementById("edges").innerText = `${numEdges}`;
  }

  UpdateDescription(description = "Click \"Start\" to visualise Fortune's sweep line algorithm.") {
    document.getElementById("step-description").innerText = description;
  }

  AnimateSweeplineAndBeachlines(valuesOfI, index, autoPlay) {
    if (this.interruptedAnimation) {
      this.interruptedAnimation = false;
      this.SetIsAutoPlaying(false);
      return;
    }
    if (index >= valuesOfI.length) {
      if (autoPlay) {
        requestAnimationFrame(() => this.NextTransition(true, true));
      }
      return;
    }
    const i = valuesOfI[index];
    const frame = () => {
      if (this.interruptedAnimation) {
        this.interruptedAnimation = false;
        this.SetIsAutoPlaying(false);
        return;
      }
      this.UpdateSweepLine(i);
      this.ClearCanvas();
      this.DrawEdges();
      this.DrawBeachLines(i);
      this.DrawCircleEvents();
      this.DrawHorizontalLine(i, "red");
      this.DrawPoints();
      this.AnimateSweeplineAndBeachlines(valuesOfI, index + 1, autoPlay);
    };
    requestAnimationFrame(frame);
  }
}