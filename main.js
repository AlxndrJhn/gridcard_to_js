// This is the most basic example (contains a single function call).
// However, in cases when multiple recognition jobs are run,
// calling Tesseract.recognize() each time is inefficient.
// See "basic-efficient.html" for a more efficient example.
var image = new MarvinImage();
var imagePath = "gridcard.png";
var canvasCropped = document.getElementById("cropped");
var progressBar = document.getElementById("processing");
var jsoutput = document.getElementById("textarea");
var worker = null;
// execute async function
(async () => {
  worker = await Tesseract.createWorker({
    logger: (m) => {
      //   console.log(m);
      if (m.status === "recognizing text") {
        progressBar.value = m.progress * 100;
      }
    },
  });
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  await worker.setParameters({
    tessedit_char_whitelist: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  });
  // debug only
  // recognize({ target: { files: ["gridcard.png"] } });
})();

function copy() {
  let textarea = document.getElementById("textarea");
  textarea.select();
  document.execCommand("copy");
}

function boundingBox(image) {
  var x1 = 9999,
    x2 = -1,
    y1 = 9999,
    y2 = -1;
  var img = image.clone();
  Marvin.thresholding(img, img, 127);
  for (var y = 0; y < img.getHeight(); y++) {
    for (var x = 0; x < img.getWidth(); x++) {
      // Is Black (Object)?
      if (img.getIntColor(x, y) == 0xff000000) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
    }
  }
  return [x1, y1, x2, y2];
}

const recognize = async ({ target: { files } }) => {
  let imgToProcess = files[0];
  let reader = new FileReader();
  reader.readAsDataURL(imgToProcess);
  reader.onload = function () {
    image.load(reader.result, async () => {
      // crop white background
      let blob = PreProcessImage();

      const {
        data: { text },
      } = await worker.recognize(blob);
      processResult(text);
      console.log(text);
    });
  };
};
const elm = document.getElementById("uploader");
elm.addEventListener("change", recognize);

function processResult(text) {
  let dict = {};
  let hasIssue = false;
  let textTrimmed = text.trim();
  let rows = textTrimmed.split("\n");
  if (rows.length != 5) throw new Error("Invalid number of rows");
  const rowToInt = ["1", "2", "3", "4", "5"];
  const colToInt = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  rows.forEach((row, i) => {
    let cells = row.split(" ");
    if (cells.length != 10) throw new Error("Invalid number of columns");
    cells.forEach((cell, j) => {
      if (cell.length != 2) hasIssue = true;
      let key = colToInt[j] + rowToInt[i];
      dict[key] = cell;
    });
  });
  console.log(dict);

  // output to text
  let functionTemplate =
    'javascript: (function () { let gridCard = {{ gridcard }}; document.getElementById("response").value = document.getElementById("nf-dialogue").textContent.match(/\\[[A-Z0-9]{2}\\]/g).map((c) => c.replace(/\\[|\\]/g, "")).map((c) => gridCard[c]).join(""); document.getElementById(\'ns-dialogue-submit\').click()})();';

  let json = JSON.stringify(dict);
  const unquoted = json.replace(/"([^"]+)":/g, "$1:");
  let functionString = functionTemplate.replace("{{ gridcard }}", unquoted);
  jsoutput.value = functionString;
}

function PreProcessImage() {
  let bb = boundingBox(image);
  let x = bb[0];
  let y = bb[1];
  let w = bb[2] - bb[0];
  let h = bb[3] - bb[1];
  let magicX1 = Math.round(x + 0.11 * w);
  let magicY1 = Math.round(y + 0.34 * h);
  let magicX2 = Math.round(0.9 * w);
  let magicY2 = Math.round(0.78 * h);
  let magicWidth = magicX2 - magicX1;
  let magicHeight = magicY2 - magicY1;
  let imageCropped = image.clone();
  Marvin.crop(image, imageCropped, magicX1, magicY1, magicWidth, magicHeight);
  let imageBW = imageCropped.clone();
  Marvin.blackAndWhite(imageCropped, imageBW, 30);

  // preview
  var imgWidth = imageBW.width;
  var screenWidth = canvasCropped.clientWidth;
  var scaleX = 1;
  if (imgWidth > screenWidth) scaleX = screenWidth / imgWidth;
  var imgHeight = imageBW.height;
  var screenHeight = canvasCropped.clientHeight;
  var scaleY = 1;
  if (imgHeight > screenHeight) scaleY = screenHeight / imgHeight;
  var scale = scaleY;
  if (scaleX < scaleY) scale = scaleX;
  if (scale < 1) {
    imgHeight = imgHeight * scale;
    imgWidth = imgWidth * scale;
  }

  canvasCropped.height = imgHeight;
  canvasCropped.width = imgWidth;

  let imagePreview = imageBW.clone();
  Marvin.scale(imageBW, imagePreview, imgWidth, imgHeight);
  imagePreview.draw(canvasCropped);

  // output for tesseract
  let imageScaled = imageBW.clone();
  let divisor = 0.5;
  Marvin.scale(
    imageBW,
    imageScaled,
    Math.floor(imageBW.getWidth() / divisor),
    Math.floor(imageBW.getHeight() / divisor)
  );

  let blob = imageScaled.toBlob();
  return blob;
}
