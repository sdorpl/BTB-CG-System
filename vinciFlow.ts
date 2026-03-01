export interface VinciFlowPayload {
    templateId: string;
    data: Record<string, any>;
}

// Mimic the structure VinciFlow might expect or export to
export const formatForVinciFlow = (id: string, data: any): string => {
    // Based on limited info, VinciFlow uses JSON. 
    // We'll wrap it in a structure that identifies the element and the data.
    // This is a best-guess and should be refined with actual specs.
    return JSON.stringify({
        id,
        ...data
    }, null, 2);
};

export const parseVinciFlowData = (json: string): any => {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error("Failed to parse VinciFlow JSON", e);
        return null;
    }
};
