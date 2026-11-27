import { describe, expect, it } from "vitest";
import { youtubeId } from "./youtube";

describe("youtubeId", () => {
  it("lê os formatos comuns de link", () => {
    expect(youtubeId("https://youtu.be/GhyZV0YarBM?si=PMoTGcwo2jLBEiDj")).toBe("GhyZV0YarBM");
    expect(youtubeId("https://www.youtube.com/watch?v=8PLDBf531ZQ")).toBe("8PLDBf531ZQ");
    expect(youtubeId("youtube.com/watch?v=8PLDBf531ZQ&t=10s")).toBe("8PLDBf531ZQ");
    expect(youtubeId("https://www.youtube.com/embed/tjR6Fb20_c8")).toBe("tjR6Fb20_c8");
    expect(youtubeId("https://youtube.com/shorts/tjR6Fb20_c8")).toBe("tjR6Fb20_c8");
    expect(youtubeId("https://m.youtube.com/watch?v=tjR6Fb20_c8")).toBe("tjR6Fb20_c8");
    expect(youtubeId("tjR6Fb20_c8")).toBe("tjR6Fb20_c8");
  });
  it("recusa o que não é vídeo do YouTube", () => {
    expect(youtubeId("")).toBeNull();
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://www.youtube.com/@canal")).toBeNull();
    expect(youtubeId("não é link")).toBeNull();
  });
});
