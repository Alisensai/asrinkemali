import type { ReadingListsRepository } from "./types";
/** No authenticated provider exists: server persistence must remain unavailable. */
export const unavailableReadingListsRepository: ReadingListsRepository = { mode: "unavailable", list: () => [], save: () => { throw new Error("READING_LISTS_SERVER_UNAVAILABLE"); } };
