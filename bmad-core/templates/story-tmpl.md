# Story {{EpicNum}}.{{StoryNum}}: {{Short Title Copied from Epic File}}

## Status: {{ Draft | Approved | InProgress | Review | Done }}

## Story

- As a {{role}}
- I want {{action}}
- so that {{benefit}}

## Acceptance Criteria (ACs)

{{ Copy the Acceptance Criteria numbered list }}

## Tasks / Subtasks

- [ ] Task 1 (AC: # if applicable)
  - [ ] Subtask1.1...
- [ ] Task 2 (AC: # if applicable)
  - [ ] Subtask 2.1...
- [ ] Task 3 (AC: # if applicable)
  - [ ] Subtask 3.1...

## Dev Technical Reference

[[LLM: SM Agent populates relevant information, only what was pulled from actual artifacts from docs folder, relevant to this story. Do not invent information. If there were important notes from previous story that is relevant here, also include them here if it will help the dev agent. You do NOT need to repeat anything from coding standards or test standards as the dev agent is already aware of those. The dev agent should NEVER need to read the PRD or architecture documents though to complete this self contained story.]]

## Dev Agent Record

### Agent Model Used: `<Agent Model Name/Version>`

### Debug Log References

{If the debug is logged to during the current story progress, create a table
with the debug log and the specific task section in the debug log - do not
repeat all the details in the story}

### Completion Notes List

{Anything the SM needs to know that deviated from the story that might impact
drafting the next story.}

### Change Log

[[LLM: Track document versions and changes during development that deviate from story dev start]]

| Date | Version | Description | Author |
| :--- | :------ | :---------- | :----- |
