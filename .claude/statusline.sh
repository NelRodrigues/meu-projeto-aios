#!/bin/bash

# Claude Code Status Line Script - Enhanced

# Get model info
MODEL="🧠 Opus 4.6"

# Generate token usage bar (visual representation)
USAGE_PERCENT=14
FILLED=$((USAGE_PERCENT / 10))
EMPTY=$((10 - FILLED))
USAGE_BAR=$(printf '█%.0s' $(seq 1 $FILLED))$(printf '░%.0s' $(seq 1 $EMPTY))
PROGRESS="📊 [$USAGE_BAR] $USAGE_PERCENT%"

# Get cost
COST="💰 \$0.00"

# Get current directory name
CURRENT_DIR=$(basename "$PWD")
DIRECTORY="📁 $CURRENT_DIR"

# Get username
USER="nelsonrodrigues"
USERNAME="🌿 $USER"

# Output status line with pipe separators
echo "$MODEL | $PROGRESS | $COST | $DIRECTORY | $USERNAME"
