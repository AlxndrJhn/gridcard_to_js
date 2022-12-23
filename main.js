const worker = await createWorker({
  logger: (m) => console.log(m),
});

(async () => {
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  const {
    data: { text },
  } = await worker.recognize(
    "https://tesseract.projectnaptha.com/img/eng_bw.png"
  );
  console.log(text);
  await worker.terminate();
})();
