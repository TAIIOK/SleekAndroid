# Person Detail (Mobile)

## Description

Mobile person/actor detail screen should match the site layout: hero with photo and personal data, expandable biography, best works rail, and a year-based project list with pagination. Phone users get a floating back button and hidden tab chrome, same as other detail screens.

## Requirements

- [x] Treat `/person/:id` as a mobile detail route (hide top/bottom chrome)
- [x] Show `MobileDetailBackButton` on the person screen (phone only)
- [x] Hero: profile photo, department chips, name, optional English name, personal data card
- [x] Biography card with expand/collapse for long text
- [x] “Лучшие работы” horizontal poster rail from top-rated credits
- [x] “Все проекты” list rows (year, poster, title, character, rating / in production)
- [x] Load more credits via infinite pagination (site parity)
- [x] Back fallback path when stack cannot pop defaults to `/movies`
- [x] Detail back prefers stack `dismiss()` so the previous screen does not remount (person lives on the (main) Stack with other title details)

## Acceptance Criteria

- Opening a person from cast on phone shows a floating back control and no tab bar
- Project list matches site row structure rather than a plain poster grid
- Long biography can be expanded and collapsed
- Load more fetches the next credits page until exhausted
