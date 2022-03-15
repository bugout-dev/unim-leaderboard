#!/usr/bin/env bash

set -eua

. /home/ubuntu/unim-leaderboard-secrets/app.env

MOONSTREAM_URL="${MOONSTREAM_URL:-}"
if [ -z "$MOONSTREAM_URL" ]; then
    echo "MOONSTREAM_URL is required"
    exit 1
fi
LEADERBOARD_URL="${LEADERBOARD_URL:-}"
if [ -z "$LEADERBOARD_URL" ]; then
    echo "LEADERBOARD_URL is required"
    exit 1
fi
LEADERBOARD_MOONSTREAM_TOKEN="${LEADERBOARD_MOONSTREAM_TOKEN:-}"
if [ -z "$LEADERBOARD_MOONSTREAM_TOKEN" ]; then
    echo "LEADERBOARD_MOONSTREAM_TOKEN is required"
    exit 1
fi
LEADERBOARD_ACCESS_TOKEN="${LEADERBOARD_ACCESS_TOKEN:-}"
if [ -z "$LEADERBOARD_ACCESS_TOKEN" ]; then
    echo "LEADERBOARD_ACCESS_TOKEN is required"
    exit 1
fi

query_names="full_data" # List of query names splited with space

for query_name in $query_names; do
    # Update data
    response_update=$(curl -s --request POST "$MOONSTREAM_URL/queries/$query_name/update_data" \
        --header "Content-Type: application/json" \
        --header "Authorization: Bearer $LEADERBOARD_MOONSTREAM_TOKEN" \
        --data-raw '{"params": {}}')
    echo "RESPONSE UPDATE - $MOONSTREAM_URL/queries/$query_name/update_data - $response_update"
    
    response_update_url=$(echo $response_update | jq -r '.url')

    sleep 30s 

    # Send response with access to leaderboard server
    timestamp=$(date +%s)

    next_timestamp=$((timestamp + 10800))

    response_send=$(curl --request POST "$LEADERBOARD_URL/update" \
        --header "Content-Type: application/json" \
        --header "Authorization: Bearer $LEADERBOARD_ACCESS_TOKEN" \
        -d "{\"cache_name\": \"$query_name\", \"access_url\": \"$response_update_url\", \"next_update\": $next_timestamp}")
    echo "RESPONSE SEND - $LEADERBOARD_URL/update - $response_send"
done
