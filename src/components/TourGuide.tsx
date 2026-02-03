import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startOnboardingTour = (onComplete?: () => void, onHighlight?: (elementId: string) => void, isChemical: boolean = false) => {

    const steps = [
        {
            element: '#protein-viewer-canvas',
            popover: {
                title: '3D Viewer Workspace',
                description: 'This is your main workspace. Click and drag to rotate, right-click to pan, and scroll to zoom.'
            }
        },
        {
            element: '#upload-section',
            popover: {
                title: 'Load Structures',
                description: isChemical
                    ? 'Search for chemicals by Name or PubChem CID. You can also upload SDF/MOL files or choose from the library.'
                    : 'Search for proteins by PDB ID. You can also upload PDB/CIF files or choose from the library.'
            }
        },

        {
            element: '#metadata-box',
            popover: {
                title: 'Structure Metadata',
                description: isChemical
                    ? 'View chemical properties like Molecular Weight, Formula, and IUPAC Name.'
                    : 'View key information including method, resolution, source organism, and deposition date.'
            }
        },
        {
            element: '#visualization-controls',
            popover: {
                title: 'Customize Appearance',
                description: isChemical
                    ? 'Change representations (Ball & Stick, Spacefill) and coloring to highlight atoms.'
                    : 'Change representations (Cartoon, Surface) and use Smart Coloring or Custom Colors to highlight specific residues.'
            }
        },
        {
            element: '#custom-color-controls',
            popover: {
                title: 'Advanced Custom Colors',
                description: 'Apply specific colors to individual residues or entire chains. Useful for highlighting active sites or specific domains.'
            }
        },
        {
            element: '#transparency-controls',
            popover: {
                title: 'Transparency Rules',
                description: 'Make specific parts of the structure transparent to reveal internal details. You can target chains or specific residue ranges.'
            }
        },
        {
            element: '#viewport-controls',
            popover: {
                title: 'Multi-View Layouts',
                description: 'Switch between Single, Dual, Triple, or Quad viewports to compare different structures or views side-by-side.'
            }
        },
        {
            element: '#analysis-tools',
            popover: {
                title: isChemical ? 'Analysis & Properties' : 'Analysis Tools',
                description: isChemical
                    ? 'Inspect calculated chemical properties (Lipophilicity, H-Bonds) and measure atomic distances.'
                    : 'Analyze structures with Superposition, Contact Maps, and precise Distance Measurements.'
            }
        },
        {
            element: '#video-timeline',
            popover: {
                title: 'Studio Timeline',
                description: 'Edit your recorded sessions. Trim clips, adjust start times, and arrange your production before exporting.'
            }
        },
        // Sequence Track (Atom List) - Desktop Only
        ...(window.innerWidth >= 768 ? [{
            element: '#sequence-track',
            popover: {
                title: isChemical ? 'Atom List' : 'Sequence Track',
                description: isChemical
                    ? 'View and interact with individual atoms. Click an atom in the list to highlight it in 3D.'
                    : 'View and interact with the amino acid sequence on the right side. Click residues to focus them in 3D.',
                side: 'left' as const,
                align: 'center' as const
            }
        }] : []),
        // Protein Only Steps
        ...(!isChemical ? [
            {
                element: '#motif-search',
                popover: {
                    title: 'Motif Search',
                    description: 'Search for specific amino acid patterns or motifs across the sequence (e.g., "RGD", "GxGxxG").'
                }
            }
        ] : []),
        {
            element: '#export-tools',
            popover: {
                title: 'Tools & Collaboration',
                description: 'Capture high-resolution snapshots, record movies, or use the Share button to start a Live Collaboration session with colleagues.'
            }
        },
        {
            element: '#media-gallery-btn',
            popover: {
                title: 'Media Gallery',
                description: 'View, organize, and download all your captured snapshots and recordings in the specialized gallery.'
            }
        },
        {
            element: '#help-button',
            popover: {
                title: 'Need Help?',
                description: 'Click here to view keyboard shortcuts or restart this tour anytime.'
            }
        }
    ];

    const driverObj = driver({
        showProgress: true,
        animate: true,
        steps: steps,
        onDestroyStarted: () => {
            if (!driverObj.hasNextStep() || confirm("Are you sure you want to exit the tour?")) {
                driverObj.destroy();
                if (onComplete) onComplete();
            }
        },
        onHighlightStarted: (_element, step) => {
            if (onHighlight && step && typeof step.element === 'string') {
                onHighlight(step.element);
            }
        }
    });

    driverObj.drive();
};
