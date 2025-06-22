#!/bin/bash

# DNA Git Automation Script
# This script provides Git automation functionality when the CLI is not available

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load configuration
CONFIG_FILE=".dna-git-config.json"
SESSION_FILE=".dna-current-session.json"

# Function to read JSON value
get_json_value() {
    local file=$1
    local path=$2
    if [ -f "$file" ]; then
        cat "$file" | python3 -c "import sys, json; data=json.load(sys.stdin); print(eval('data${path}'))" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Function to check if auto-commit is enabled
is_auto_commit_enabled() {
    local enabled=$(get_json_value "$CONFIG_FILE" "['automation']['autoCommit']")
    [ "$enabled" = "True" ]
}

# Function to check if tests are required
are_tests_required() {
    local required=$(get_json_value "$CONFIG_FILE" "['automation']['requireTests']")
    [ "$required" = "True" ]
}

# Function to run pre-commit checks
run_pre_commit_checks() {
    echo -e "${BLUE}Running pre-commit checks...${NC}"
    
    # Check for blocked patterns
    local blocked_files=$(git diff --cached --name-only | grep -E '\.(key|pem|p12)$|\.env\.(local|production)|secrets\.json|credentials\.json' || true)
    if [ ! -z "$blocked_files" ]; then
        echo -e "${RED}Error: Blocked files detected:${NC}"
        echo "$blocked_files"
        return 1
    fi
    
    # Check file sizes
    local large_files=$(git diff --cached --name-only | xargs -I {} sh -c 'if [ -f "{}" ] && [ $(wc -c < "{}") -gt 10485760 ]; then echo "{}"; fi' || true)
    if [ ! -z "$large_files" ]; then
        echo -e "${RED}Error: Large files detected (>10MB):${NC}"
        echo "$large_files"
        return 1
    fi
    
    echo -e "${GREEN}Pre-commit checks passed${NC}"
    return 0
}

# Function to generate commit message
generate_commit_message() {
    local type=$1
    local epic=$(get_json_value "$SESSION_FILE" "['epic']")
    local story=$(get_json_value "$SESSION_FILE" "['story']")
    local filesModified=$(get_json_value "$SESSION_FILE" "['progress']['filesModified']")
    local testsAdded=$(get_json_value "$SESSION_FILE" "['progress']['testsAdded']")
    local coverage=$(get_json_value "$SESSION_FILE" "['metrics']['coverage']")
    
    case "$type" in
        "progress")
            echo "chore(${epic}): progress update - ${filesModified} files modified, ${testsAdded} tests added"
            ;;
        "test-success")
            echo "test(${epic}): all tests passing - ${coverage}% coverage achieved"
            ;;
        "session-complete")
            echo "feat(${epic}-${story}): complete story implementation

Auto-generated commit for session completion

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
            ;;
        *)
            echo "chore(${epic}): automated commit"
            ;;
    esac
}

# Function to create rollback point
create_rollback_point() {
    local rollback_file=".dna-git-rollback.json"
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "none")
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    
    echo "{
  \"timestamp\": \"$timestamp\",
  \"commitHash\": \"$commit_hash\",
  \"branch\": \"$(git branch --show-current)\",
  \"sessionId\": \"$(get_json_value "$SESSION_FILE" "['id']")\"
}" > "$rollback_file"
    
    echo -e "${BLUE}Created rollback point at commit: $commit_hash${NC}"
}

# Function to perform auto-commit
auto_commit() {
    local commit_type=${1:-"progress"}
    
    if ! is_auto_commit_enabled; then
        echo -e "${YELLOW}Auto-commit is disabled${NC}"
        return 0
    fi
    
    # Check if there are changes to commit
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}No changes to commit${NC}"
        return 0
    fi
    
    # Create rollback point
    create_rollback_point
    
    # Run pre-commit checks
    if ! run_pre_commit_checks; then
        echo -e "${RED}Pre-commit checks failed. Commit aborted.${NC}"
        return 1
    fi
    
    # Stage all changes
    git add -A
    
    # Generate commit message
    local commit_msg=$(generate_commit_message "$commit_type")
    
    # Perform commit
    git commit -m "$commit_msg"
    
    echo -e "${GREEN}Auto-commit successful${NC}"
    return 0
}

# Function to show status
show_status() {
    echo -e "${BLUE}=== Git Automation Status ===${NC}"
    echo -e "Config file: ${CONFIG_FILE}"
    echo -e "Auto-commit enabled: $(is_auto_commit_enabled && echo -e "${GREEN}Yes${NC}" || echo -e "${RED}No${NC}")"
    echo -e "Require tests: $(are_tests_required && echo -e "${GREEN}Yes${NC}" || echo -e "${YELLOW}No${NC}")"
    
    if [ -f "$SESSION_FILE" ]; then
        echo -e "\n${BLUE}Current Session:${NC}"
        echo -e "Epic: $(get_json_value "$SESSION_FILE" "['epic']")"
        echo -e "Story: $(get_json_value "$SESSION_FILE" "['story']")"
        echo -e "Status: $(get_json_value "$SESSION_FILE" "['status']")"
    fi
    
    echo -e "\n${BLUE}Git Status:${NC}"
    git status --short
}

# Main command handling
case "${1:-status}" in
    "auto-commit")
        auto_commit "${2:-progress}"
        ;;
    "status")
        show_status
        ;;
    "enable")
        echo -e "${GREEN}Enabling auto-commit...${NC}"
        # Update config to enable auto-commit
        if [ -f "$CONFIG_FILE" ]; then
            tmp=$(mktemp)
            jq '.automation.autoCommit = true' "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
            echo -e "${GREEN}Auto-commit enabled${NC}"
        else
            echo -e "${RED}Config file not found${NC}"
        fi
        ;;
    "disable")
        echo -e "${YELLOW}Disabling auto-commit...${NC}"
        # Update config to disable auto-commit
        if [ -f "$CONFIG_FILE" ]; then
            tmp=$(mktemp)
            jq '.automation.autoCommit = false' "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
            echo -e "${YELLOW}Auto-commit disabled${NC}"
        else
            echo -e "${RED}Config file not found${NC}"
        fi
        ;;
    "help")
        echo "DNA Git Automation Script"
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  auto-commit [type]  - Perform auto-commit (types: progress, test-success, session-complete)"
        echo "  status              - Show automation status"
        echo "  enable              - Enable auto-commit"
        echo "  disable             - Disable auto-commit"
        echo "  help                - Show this help message"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac