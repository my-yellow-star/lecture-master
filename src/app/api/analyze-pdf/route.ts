import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { image, pageNumber } = await request.json();

    if (!image || !pageNumber) {
      return NextResponse.json(
        { error: "이미지와 페이지 번호가 필요합니다." },
        { status: 400 }
      );
    }

    // Base64 이미지 데이터에서 실제 이미지 데이터 추출
    const base64Data = image.split(",")[1];

    // GPT-4 Vision API를 사용하여 이미지 분석
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "당신은 강의 자료를 분석하고 설명하는 친절한 교수님입니다. 강의 자료의 내용을 이해하기 쉽게 설명하고, 필요한 배경 지식도 함께 제공해주세요. 특별히 중요한 부분이나 주목할 만한 내용이 있다면 마커로 표시해주세요.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 강의 자료의 ${pageNumber}페이지를 분석해주세요. 내용을 이해하기 쉽게 설명하고, 필요한 배경 지식도 함께 제공해주세요.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const analysis = response.choices[0].message.content;

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("PDF 분석 중 오류 발생:", error);
    return NextResponse.json(
      { error: "PDF 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
