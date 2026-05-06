# Testing Philosophy

## Principles

1. **Test behavior, not implementation** - tests should verify outcomes, not internal details
2. **Write tests before code** - TDD cycle: Red -> Green -> Refactor
3. **One assertion per test** - each test should verify one behavior
4. **Tests are documentation** - a good test suite describes how the system works

## Coverage Goals

- Unit tests: 90%+ coverage on business logic
- Integration tests: critical paths only
- E2E tests: happy path + top 3 error scenarios
