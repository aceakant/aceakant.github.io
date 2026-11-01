"""Checks the Claude API key and prompt caching with two short calls (never writes or publishes anything).
Call 1 should write the prompt to the cache; call 2, sent straight after, should read it back."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "agents"))
import common  # noqa: E402
import factcheck_agent  # noqa: E402
import writer_agent  # noqa: E402

# A fixed prompt long enough to be cacheable (the model's minimum is a few hundred tokens).
DOC = "Reference text, for a caching test only:\n\n" + writer_agent.SYSTEM + "\n\n" + factcheck_agent.SYSTEM


def main():
    if common.DRY_RUN:
        print("No ANTHROPIC_API_KEY here, so nothing to check.")
        return
    results = []
    for n in (1, 2):
        text, _ = common.ask_claude("You are a terse assistant.", DOC + "\n\nReply with the single word OK.", max_tokens=20, cache=True)
        u = dict(common.LAST_USAGE)
        results.append(u)
        print(f"Call {n}: reply={text.strip()!r} cache write={u['cache_creation_input_tokens']} cache read={u['cache_read_input_tokens']}")
    if results[1]["cache_read_input_tokens"] > 0:
        print("✅ Prompt caching is working: call 2 read the prompt from cache.")
    elif results[0]["cache_creation_input_tokens"] == 0:
        print("ℹ️ Nothing was cached: the prompt is below the model's minimum cacheable length.")
        sys.exit(1)
    else:
        print("❌ Cache was written but not read back.")
        sys.exit(1)


if __name__ == "__main__":
    main()
