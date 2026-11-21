// Shim test entrypoint to allow CI workflows running from tools/ts to locate the SquadSync analytics tests.
// The actual test logic lives under the repository-level tests/analytics suite.
import '../../../tests/analytics/squadsync_responses.test.ts';
