const canvas = document.getElementById("main-canvas");
const canvasWrapper = new Canvas(canvas);
let draggingPoint = null;


canvasWrapper.SetUpdateAllFunction(updateAll);


window.addEventListener("resize", () => canvasWrapper.HandleResize());


// Add point on click
canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const point = canvasWrapper.GetPointAtPosition(x, y);

    if (point) {
        draggingPoint = point;
        console.log(`Started dragging point at (${point.x}, ${point.y}).`);
    } else {
        canvasWrapper.AddPoint(x, y);
        draggingPoint = canvasWrapper.GetPointAtPosition(x, y);
    }
});

// Update point position while dragging
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    if (draggingPoint) {
        draggingPoint = canvasWrapper.MovePoint(draggingPoint, mouseX, mouseY);
    } else {
        let point = canvasWrapper.GetPointAtPosition(mouseX, mouseY);
        const popup = document.getElementById("popup");
        if (point) {
            canvas.style.cursor = "pointer";
            // Update popup content and position

            popup.style.display = "block";
            popup.style.left = `${event.clientX + 10}px`; // Offset popup slightly
            popup.style.top = `${event.clientY + 10}px`;
            popup.textContent = `Coordinates: (${Math.round(point.x)}, ${Math.round(point.y)})`;
        } else {
            canvas.style.cursor = "default";
            popup.style.display = "none";
        }
    }
});

// Stop dragging
canvas.addEventListener("mouseup", () => {
    draggingPoint = null;
});

document.addEventListener("DOMContentLoaded", () => {
    canvasWrapper.AddRandomPoints(10);
    updateAll();
});





