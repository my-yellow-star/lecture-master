import { PDFDocument as PDFLibDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Note } from "@/types";

// 텍스트를 지정된 너비에 맞게 줄바꿈하는 함수
const wrapText = (
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  font: any,
  fontSize: number,
  maxWidth: number
) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + " " + word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    // 여유 공간을 10% 더 확보
    if (width < maxWidth * 0.9) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  return lines;
};

export const savePDF = async (
  notes: Note[],
  originalPdfUrl: string,
  fileName: string
) => {
  try {
    // 원본 PDF 로드
    const originalPdfBytes = await fetch(originalPdfUrl).then((res) =>
      res.arrayBuffer()
    );
    const originalPdfDoc = await PDFLibDocument.load(originalPdfBytes);

    // fontkit 등록
    originalPdfDoc.registerFontkit(fontkit);

    // Noto Sans KR 폰트 임베딩
    const fontBytes = await fetch(
      "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf"
    ).then((res) => res.arrayBuffer());
    const font = await originalPdfDoc.embedFont(fontBytes);

    // 모든 페이지에 메모 그리기
    const totalPages = originalPdfDoc.getPageCount();
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const page = originalPdfDoc.getPage(pageNum);
      const { width, height } = page.getSize();

      // 현재 페이지의 메모 필터링
      const pageNotes = notes.filter((note) => note.page === pageNum + 1);

      for (const note of pageNotes) {
        const date = new Date(parseInt(note.id)).toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        // 메모 위치 계산 (PDF 좌표계는 하단이 0)
        // note.x와 note.y는 퍼센트 값이므로 실제 PDF 좌표로 변환
        let x = (note.x / 100) * width;
        let y = height - (note.y / 100) * height;

        // 메모가 페이지를 벗어나는지 확인하고 조정
        // x가 음수인 경우
        if (x < 0) {
          x = 0;
        }

        // 메모 텍스트의 최대 너비 설정 (페이지 너비의 25%로 제한하고 x 좌표 고려)
        const maxWidth = Math.min(width * 0.25, width - x - 20); // 여백 20pt 추가

        // 메모 텍스트를 줄바꿈 처리
        const textLines = note.text
          .split("\n")
          .flatMap((line) =>
            wrapText(line.replace(/\s+/g, " "), font, 8, maxWidth)
          );

        const maxTextWidth = Math.max(
          ...textLines.map((line) => font.widthOfTextAtSize(line, 8)),
          font.widthOfTextAtSize(date, 6)
        );

        // 한글 두글자의 너비 계산
        const twoCharWidth = font.widthOfTextAtSize("가나", 8);

        // 메모 배경의 너비와 높이 계산
        const padding = 8; // 좌우 여백 증가
        const lineHeight = 10; // 줄 간격
        const backgroundWidth = maxTextWidth + padding * 2 + twoCharWidth; // 두글자 너비 추가
        const backgroundHeight = textLines.length * lineHeight + 20; // 여백 증가

        // y 좌표 조정 (배경 높이 고려)
        y = y - backgroundHeight;

        // 높이가 페이지를 벗어나는 경우
        if (y < 0) {
          y = 0;
        }

        // 메모 배경 그리기 (반투명)
        page.drawRectangle({
          x,
          y: y - 2,
          width: backgroundWidth,
          height: backgroundHeight + 4,
          color: rgb(0.97, 0.97, 0.97),
          opacity: 0.7,
        });

        // 좌측 상단에 노란색 점 그리기
        const dotSize = 4;
        page.drawCircle({
          x: x + dotSize / 2,
          y: y + backgroundHeight + dotSize / 2,
          size: dotSize,
          color: rgb(1, 0.8, 0), // 노란색
        });

        // 날짜 그리기
        page.drawText(date, {
          x: x + padding,
          y: y + backgroundHeight - 6,
          size: 6,
          color: rgb(0.4, 0.4, 0.4),
          font,
        });

        // 메모 텍스트 그리기
        textLines.forEach((line, index) => {
          page.drawText(line, {
            x: x + padding,
            y: y + backgroundHeight - 16 - index * lineHeight,
            size: 8,
            font,
          });
        });
      }
    }

    // 수정된 PDF 저장
    const modifiedPdfBytes = await originalPdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // 파일 이름 생성 (원본 파일 이름에 _revised 추가)
    const newFileName = `${fileName.replace(".pdf", "")}_revised.pdf`;

    // 파일 다운로드
    const link = document.createElement("a");
    link.href = url;
    link.download = newFileName;
    link.click();

    // URL 정리
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF 저장 중 오류가 발생했습니다:", error);
    throw new Error("PDF 저장 중 오류가 발생했습니다.");
  }
};
