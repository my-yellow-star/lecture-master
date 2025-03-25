import type {
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

export async function extractText(pdfFile: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjs.getDocument(URL.createObjectURL(pdfFile)).promise;
  const pageTexts: { [key: number]: string } = {};

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // y 좌표별로 텍스트 아이템들을 그룹화
    const textGroups: {
      [key: number]: Array<{ text: string; x: number }>;
    } = {};
    const Y_TOLERANCE = 5; // y 좌표 허용 오차

    textContent.items.forEach((item: TextItem | TextMarkedContent) => {
      if ("str" in item && "transform" in item && item.str.trim() !== "") {
        const y = Math.round(item.transform[5]);
        const x = item.transform[4]; // x 좌표

        // 가장 가까운 y 좌표 그룹 찾기
        const closestY =
          Object.keys(textGroups)
            .map(Number)
            .find((groupY) => Math.abs(groupY - y) <= Y_TOLERANCE) || y;

        if (!textGroups[closestY]) {
          textGroups[closestY] = [];
        }
        textGroups[closestY].push({
          text: item.str.replace(/\n/g, " "),
          x: x,
        });
      }
    });

    // y 좌표를 기준으로 내림차순 정렬하고, 각 그룹 내에서 x 좌표로 정렬
    const sortedGroups = Object.entries(textGroups)
      .sort(([y1], [y2]) => Number(y2) - Number(y1))
      .map(([, group]) =>
        group.sort((a, b) => a.x - b.x).map((item) => item.text)
      );

    // 각 그룹의 텍스트를 하나의 문장으로 결합
    const pageText = sortedGroups.map((group) => group.join(" ")).join("\n");

    pageTexts[i] = pageText;
  }

  return {
    numPages: pdf.numPages,
    pageTexts,
  };
}
