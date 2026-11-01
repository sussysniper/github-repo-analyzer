// Keeps an older response from replacing the result of a newer search.
export function createSearchCoordinator() {
  let current = null;
  return {
    cancel() { current?.controller.abort(); current = null; },
    async run(task, handlers) {
      current?.controller.abort();
      const entry = { controller: new AbortController() };
      current = entry;
      try {
        const value = await task(entry.controller.signal);
        if (current === entry) handlers.success(value);
      } catch (error) {
        if (current === entry && error?.name !== 'AbortError') handlers.error(error);
      } finally {
        if (current === entry) { current = null; handlers.done?.(); }
      }
    }
  };
}
