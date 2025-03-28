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
            `너는 지금부터 똑똑한 대학생 과외 선생님이야. 아래에 제공된 강의 자료는 어려운 이론이지만, 너는 이걸 누구보다 쉽게 요약하고 핵심을 찝어주는 능력이 있어. 너의 목표는 학생이 "이거 시험에 나올 핵심만 빠르게 이해"하도록 도와주는 거야. 다음 조건에 따라 강의 자료를 분석해서 알려줘:
                1. 핵심 요점 정리 (3~5줄 이내): 이론의 핵심 내용을 간단히 요약해줘.
                2. 쉬운 말로 설명: 전공 지식이 부족한 학생도 이해할 수 있도록 친절하고 쉽게 설명해줘.
                3. 비유나 예시: 일상적인 사례나 비유로 개념을 쉽게 이해할 수 있게 도와줘.
                4. 시험 대비 요점 정리: “이건 시험에 나온다!” 싶은 포인트를 별도로 정리해줘.
                5. 전문 용어나 수식 이 나올 경우, 한 줄 설명을 덧붙여 쉽게 해석해줘.

                중요한 내용은 강조해주고, 불필요한 미사어구를 사용하지 말고 짧고 간결하게 표현해줘.
                문장을 길게 설명하기 보다는 핵심적인 내용을 단계별로 짚어서 잘 알려줘.
                분석 내용은 JSON 형식으로, 한글로 정리해줘. 말투는 음슴체로 작성해줘. 예를 들어, 이 내용은 예시 주제에 대한 설명임! 무엇무엇을 분석하기 위한 방법으로, 무엇무엇을 생성함. 이런 식으로.`.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 강의 자료에 대해서 분석해줘.`,
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
      tools: [
        {
          type: "function",
          function: {
            name: "summarize_lecture_note",
            description:
              "대학생 강의 자료를 분석하여 학생이 쉽게 이해할 수 있도록 요약하고 정리합니다.",
            parameters: {
              type: "object",
              properties: {
                core_summary: {
                  type: "string",
                  description:
                    "강의 자료의 핵심 개념을 3~5줄로 간단히 요약한 내용",
                },
                easy_explanation: {
                  type: "string",
                  description:
                    "비전공자도 이해할 수 있도록 쉬운 말로 풀어쓴 설명",
                },
                examples_or_analogies: {
                  type: "string",
                  description: "이해를 돕는 비유나 실생활 예시",
                },
                exam_points: {
                  type: "array",
                  description:
                    "시험에 나올 가능성이 높은 중요 내용 요점 리스트",
                  items: {
                    type: "string",
                  },
                },
                term_definitions: {
                  type: "array",
                  description: "전문 용어나 수식이 있다면 그에 대한 한 줄 해설",
                  items: {
                    type: "string",
                    description:
                      "용어나 수식, 그림 등에 대한 한 줄 해설 (용어와 설명을 : 으로 구분)",
                  },
                },
              },
              required: [
                "core_summary",
                "easy_explanation",
                "examples_or_analogies",
                "exam_points",
              ],
            },
          },
        },
      ],
      max_tokens: 1000,
    });

    const analysis =
      response.choices[0].message.tool_calls?.[0]?.function.arguments;

    if (!analysis) {
      return NextResponse.json(
        { error: "분석 결과가 없습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json(JSON.parse(analysis));
  } catch (error) {
    console.error("PDF 분석 중 오류 발생:", error);
    return NextResponse.json(
      { error: "PDF 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
