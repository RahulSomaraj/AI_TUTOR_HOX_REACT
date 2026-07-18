
import { describe, it, expect, vi, afterEach } from "vitest";
import { downloadFile } from "./download";

afterEach(() => vi.restoreAllMocks());

describe("downloadFile", () => {
    it("clicks an anchor with the url and filename", () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
        downloadFile("https://x.test/receipt.pdf", "receipt.pdf");
        expect(click).toHaveBeenCalledOnce();
    });

    it("creates and revokes an object url for blobs", () => {
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
        const create = vi.fn(() => "blob:mock");
        const revoke = vi.fn();
        URL.createObjectURL = create;
        URL.revokeObjectURL = revoke;

        downloadFile(new Blob(["x"]), "statement.pdf");
        expect(create).toHaveBeenCalledOnce();
        expect(revoke).toHaveBeenCalledWith("blob:mock");
    });

    it("leaves no anchor in the DOM", () => {
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
        downloadFile("https://x.test/a.pdf");
        expect(document.querySelectorAll("a").length).toBe(0);
    });
});