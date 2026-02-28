import { create } from "zustand";

interface ScreenshotStore {
    // Map of deviceId (or serial) to the latest ObjectURL representing its screenshot
    images: Record<string, string>;
    setImage: (id: string, url: string) => void;
    getImage: (id: string) => string | null;
}

export const useScreenshotStore = create<ScreenshotStore>((set, get) => ({
    images: {},
    setImage: (id, url) => {
        set((state) => {
            const oldUrl = state.images[id];
            // Revoke the old blob to prevent memory leaks when overwriting
            if (oldUrl && oldUrl.startsWith("blob:") && oldUrl !== url) {
                URL.revokeObjectURL(oldUrl);
            }
            return {
                images: {
                    ...state.images,
                    [id]: url,
                },
            };
        });
    },
    getImage: (id) => get().images[id] || null,
}));
