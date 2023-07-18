import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pdfjs from "pdfjs-dist";
import axios from "axios";
import canvas from "canvas";

const app = express();
const port = process.env.PORT || 8080;
const scaleVar = 2;
const topCut = 260 * scaleVar;
const botCut = 180 * scaleVar;

const sideCut = 55 * scaleVar;
async function getImage(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    if (!response.data || response.data.length === 0) {
      console.log("Error: Could not get PDF");
      return null;
    }
    // Convert the ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(response.data);

    var pdf = await pdfjs.getDocument(uint8Array).promise;
    var page = await pdf.getPage(1);

    console.log("Page loaded");

    var viewport = page.getViewport({ scale: scaleVar });
    var canvasVar = canvas.createCanvas(viewport.width, viewport.height);
    // var canvas = document.createElement("canvas");

    // Prepare canvas using PDF page dimensions
    var context = canvasVar.getContext("2d");
    canvasVar.height = viewport.height;
    canvasVar.width = viewport.width;

    // Render PDF page into canvas context
    var renderContext = { canvasContext: context, viewport: viewport };

    await page.render(renderContext).promise;

    // Return the data as an array with a single element
    return canvasVar.toBuffer("image/png");
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function modifyImage(data) {
  console.log("Modifying image");
  try {
    const canvasVar = canvas.createCanvas();
    const ctx = canvasVar.getContext("2d");

    // Load the image from raw PNG data
    const image = await canvas.loadImage(data);

    // Set the canvas size to the original image size (excluding the top 260 pixels)
    canvasVar.width = image.width;
    canvasVar.height = image.height - topCut - botCut;

    // Draw the image on the canvas, starting from (0, 260) to cut off the top pixels
    ctx.drawImage(
      image,
      0,
      topCut,
      image.width - sideCut,
      image.height - topCut - botCut,
      0,
      0,
      image.width - sideCut,
      image.height - topCut - botCut
    );

    // Get the PNG data as a Buffer
    const buffer = canvasVar.toBuffer("image/png");

    return buffer;
  } catch (error) {
    console.log(error);
    return null;
  }
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.text());
app.use(cors());

// Serve the frontend SPA (replace 'path-to-your-frontend-folder' with the actual path to your SPA's build folder)
app.use(express.static("src/spa"));

/* 
https://cdn.photofinish.live/production/reports/breedingReport/43340972-b284-4c46-8987-aedd6de89671/Prime%20Time%20x%20Matriarch%20Breeding%20Report.pdf
*/

// API route (sample route, you can define your own routes here)
app.post("/fetch", async (req, res) => {
  try {
    const url = req.body;
    console.log(url);
    console.log("fetching");
    var data = await getImage(url);

    if (data !== null) {
      data = await modifyImage(data);
      console.log("sending");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Length", data.length);
      res.send(data);
    } else {
      console.log("Error: Could not get PDF");
      res.status(404).send("Error: Could not get PDF");
    }
  } catch (error) {
    console.error("Error fetching PDF:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
