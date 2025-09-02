
# OpenRouter Chat Completion API

## 소개

이 문서는 OpenRouter의 Chat Completion API에 대한 기술적인 내용을 담고 있습니다. 선택한 모델에 chat completion 요청을 보내는 방법에 대해 설명합니다.

## 기본 요청

chat completion 요청을 보내기 위해서는 `messages` 배열을 포함해야 합니다.

### 헤더

| 이름          | 타입   | 필수 여부 | 설명                                                     |
| :------------ | :----- | :-------- | :------------------------------------------------------- |
| `Authorization` | string | 필수      | `Bearer <token>` 형태의 Bearer 인증 토큰입니다. |

### 요청 본문

| 필드                | 타입                | 필수 여부 | 설명                                                                                              |
| :------------------ | :------------------ | :-------- | :------------------------------------------------------------------------------------------------ |
| `model`             | string              | 필수      | 사용할 모델의 ID입니다. 지정하지 않으면 사용자의 기본 모델이 사용됩니다.                            |
| `messages`          | list of objects     | 필수      | 대화 내역을 나타내는 메시지 객체의 배열입니다.                                                    |
| `models`            | list of strings     | 선택      | 라우팅 오버라이드를 위한 대체 모델 목록입니다.                                                     |
| `provider`          | object              | 선택      | 공급자 라우팅에 대한 기본 설정입니다.                                                              |
| `reasoning`         | object              | 선택      | 모델 추론/사고 토큰에 대한 구성입니다.                                                            |
| `usage`             | object              | 선택      | 응답에 사용량 정보를 포함할지 여부입니다.                                                         |
| `transforms`        | list of strings     | 선택      | 프롬프트 변환 목록입니다 (OpenRouter 전용).                                                       |
| `stream`            | boolean             | 선택      | 결과를 스트리밍할지 여부입니다. 기본값은 `false`입니다.                                           |
| `max_tokens`        | integer             | 선택      | 생성할 최대 토큰 수입니다. (범위: `[1, context_length)`)                                          |
| `temperature`       | double              | 선택      | 샘플링 온도를 조절합니다. (범위: `[0, 2]`)                                                        |
| `seed`              | integer             | 선택      | 결정론적 출력을 위한 시드 값입니다.                                                               |
| `top_p`             | double              | 선택      | Top-p 샘플링 값입니다. (범위: `(0, 1]`)                                                            |
| `top_k`             | integer             | 선택      | Top-k 샘플링 값입니다. (범위: `[1, Infinity)`)                                                    |
| `frequency_penalty` | double              | 선택      | 빈도 페널티를 조절합니다. (범위: `[-2, 2]`)                                                       |
| `presence_penalty`  | double              | 선택      | 존재 페널티를 조절합니다. (범위: `[-2, 2]`)                                                       |
| `repetition_penalty`| double              | 선택      | 반복 페널티를 조절합니다. (범위: `(0, 2]`)                                                        |
| `logit_bias`        | map[string] to double | 선택      | 특정 토큰에 대한 편향을 설정합니다.                                                               |
| `top_logprobs`      | integer             | 선택      | 반환할 상위 로그 확률의 수입니다.                                                                   |
| `min_p`             | double              | 선택      | 최소 확률 임계값입니다. (범위: `[0, 1]`)                                                          |
| `top_a`             | double              | 선택      | 대체 상위 샘플링 매개변수입니다. (범위: `[0, 1]`)                                                 |
| `user`              | string              | 선택      | 최종 사용자를 위한 안정적인 식별자입니다. 남용을 감지하고 방지하는 데 사용됩니다.                   |

### 응답 (성공)

| 필드      | 타입             | 설명                               |
| :-------- | :--------------- | :--------------------------------- |
| `id`      | string or null   | 요청의 고유 ID입니다.              |
| `choices` | list of objects or null | 생성된 메시지 목록을 포함합니다. |

### cURL 예시

#### 요청

```bash
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer $YOUR_OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-pro-1.5",
    "messages": [
      {"role": "user", "content": "What is the weather like in Seoul?"}
    ]
  }'
```

#### 응답

```json
{
  "id": "gen-1234567890abcdef",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "google/gemini-pro-1.5",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "\nI am a large language model, able to communicate in response to a wide range of prompts and questions, but my knowledge of this topic is limited."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 17,
    "completion_tokens": 29,
    "total_tokens": 46
  }
}
```
