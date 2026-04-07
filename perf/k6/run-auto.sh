#!/bin/bash

# ==========================================
# ⚙️ 기본 설정 (매번 입력하지 않아도 됨)
# ==========================================
HOST_IP="43.202.84.158"
DEFAULT_PROM_URL="https://monitor.maum-on.parksuyeon.site/prometheus/api/v1/write"
DEFAULT_TREND_STATS="p(90),p(95),p(99),avg,min,max"

# 1. TEST_ID 자동 생성 (변수가 없는 경우에만)
if [ -z "$TEST_ID" ]; then
  export TEST_ID="test-$(date +%Y%m%d-%H%M%S)"
fi

# 2. Prometheus 관련 기본값 설정
export K6_PROMETHEUS_RW_SERVER_URL="${K6_PROMETHEUS_RW_SERVER_URL:-$DEFAULT_PROM_URL}"
export K6_PROMETHEUS_RW_TREND_STATS="${K6_PROMETHEUS_RW_TREND_STATS:-$DEFAULT_TREND_STATS}"

function print_usage() {
  echo "❌ 사용법:"
  echo "  ./perf/k6/run-auto.sh <도메인> <모드> [--reset] [추가 k6 옵션]"
  echo ""
  echo "예시: ./perf/k6/run-auto.sh members load"
  echo "예시: ./perf/k6/run-auto.sh members load --reset"
}

# 활성 포트 감지
function resolve_active_port() {
  if curl -s -m 1 "http://$HOST_IP:18080/api/v1/posts?page=0&size=1" > /dev/null; then
    echo "18080"
  else
    echo "18081"
  fi
}

# 데이터 리셋 수행
function perform_reset() {
  local port=$1
  local base_url="http://$HOST_IP:$port"
  echo "♻️  데이터 리셋 시작... ($base_url)"
  
  local login_res=$(curl -s -X POST "$base_url/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"k6-admin-0001@admin.maumon.local","password":"Maumon!2026#LoadTest"}')
  
  local token=$(echo "$login_res" | jq -r .data.accessToken)
  if [ -z "$token" ] || [ "$token" = "null" ]; then
    echo "❌ 관리자 로그인 실패!"
    exit 1
  fi

  local reset_res=$(curl -s -X POST "$base_url/api/v1/loadtest/reset" \
    -H "Authorization: Bearer $token")
  echo "✅ 리셋 결과: $(echo "$reset_res" | jq -r .msg)"
}

# 1. 리셋 모드
if [ "$1" = "reset" ]; then
  perform_reset "$(resolve_active_port)"
  exit 0
fi

# 2. 인자 확인
if [ -z "$1" ] || [ -z "$2" ]; then
  print_usage
  exit 1
fi

DOMAIN=$1
MODE=$2
shift 2

# 3. 플래그 및 추가 인자 분리
DO_RESET=false
K6_EXTRA_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--reset" ]; then
    DO_RESET=true
  else
    K6_EXTRA_ARGS+=("$arg")
  fi
done

# 4. 실행
echo "🔍 활성 포트를 탐색 중..."
ACTIVE_PORT=$(resolve_active_port)
echo "✅ 서버 감지: http://$HOST_IP:$ACTIVE_PORT | 🆔 TEST_ID: $TEST_ID"

if [ "$DO_RESET" = true ]; then
  perform_reset "$ACTIVE_PORT"
fi

echo "🚀 K6 실행 (Prometheus 전송 포함)..."

# 핵심: run.mjs를 호출할 때 -- 를 명시적으로 넣어 K6 옵션들이 인자로 잘 전달되게 합니다.
BASE_URL="http://$HOST_IP:$ACTIVE_PORT" \
node perf/k6/run.mjs "$DOMAIN" "$MODE" -- \
  -o experimental-prometheus-rw \
  "${K6_EXTRA_ARGS[@]}"
