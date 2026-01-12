# Script Reference

## Daily Workflow
```bash
npm run validate        # Check all files
npm run generate        # Update generated files
```

## Individual Commands
```bash
# Validation
npm run validate:schema      # Validate _games, _runners, _runs
npm run validate:runs        # Validate _queue_runs
npm run detect:unknown       # Find unknown genres/platforms

# Generation
npm run generate:codeowners        # Update .github/CODEOWNERS
npm run generate:run-categories    # Create category pages
npm run generate:run-form -- <id>  # Create submission form

# Checks (CI - read-only)
npm run check:all              # All checks
npm run check:run-categories   # Verify category pages
npm run check:codeowners       # Verify CODEOWNERS

# Moderation
npm run promote:runs:dry       # Preview run promotion
npm run promote:runs           # Promote approved runs

# Utilities
npm run sync:git               # Reset to origin/main
npm run build                  # Build production assets
```

## Order of Operations

1. **sync:git** - Start with clean slate
2. **validate** - Check for errors
3. **generate** - Update files
4. **check:all** - Verify (optional)
5. Commit & push
