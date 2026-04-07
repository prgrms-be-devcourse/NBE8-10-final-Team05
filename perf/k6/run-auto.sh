#!/bin/bash

# 설정: 접속할 호스트 IP (환경에 맞게 수정 가능)
HOST_IP="43.202.84.158"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "❌ 사용법: ./perf/k6/run-auto.sh <도메인> <모드>"
  echo "예시: ./perf/k6/run-auto.sh posts load"
  exit 1
fi

DOMAIN=$1
MODE=$2
shift 2

echo "🔍 활성화된 포트(Blue/Green)를 탐색합니다..."

# 18080 포트에 짧은 타임아웃(1초)으로 요청을 보내서 살아있는지 확인합니다.
# 서버가 떠있다면 빈 응답이나 404/401 에러라도 돌아오므로 curl이 성공으로 간주함.
if curl -s -m 1 "http://$HOST_IP:18080/api/v1/posts?page=0&size=1" > /dev/null; then
  ACTIVE_PORT="18080"
else
  ACTIVE_PORT="18081"
fi

echo "✅ 감지된 활성 서버: http://$HOST_IP:$ACTIVE_PORT"

# BASE_URL은 자동 설정하되, 기존 환경변수들은 그대로 넘겨줍니다. 
# "$@"를 통해 추가 옵션('-- -o xxxx')들도 모두 전달됩니다.
BASE_URL="http://$HOST_IP:$ACTIVE_PORT" node perf/k6/run.mjs "$DOMAIN" "$MODE" "$@"
