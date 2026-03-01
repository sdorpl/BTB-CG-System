import React, { useEffect } from 'react';
import { useGraphicsStore } from '../store/useGraphicsStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { GraphicRenderer } from '../components/GraphicRenderer';

export const OutputPage: React.FC = () => {
    const graphics = useGraphicsStore(state => state.graphics);
    const fetchGraphics = useGraphicsStore(state => state.fetchGraphics);
    const fetchTemplates = useTemplateStore(state => state.fetchTemplates);

    useEffect(() => {
        fetchTemplates();
        fetchGraphics();

        // Polling mechanism to keep Output Page in sync with json-server
        const intervalId = setInterval(() => {
            fetchGraphics();
        }, 500);

        return () => clearInterval(intervalId);
    }, [fetchGraphics, fetchTemplates]);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1920px',
            height: '1080px',
            overflow: 'hidden',
            backgroundColor: 'transparent' // Transparent for OBS
        }}>
            <GraphicRenderer graphics={graphics} />
        </div>
    );
};
