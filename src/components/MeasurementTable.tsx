
import React from 'react';
import { Trash2, FileText, FileSpreadsheet } from 'lucide-react';
import type { Measurement } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from '../lib/i18n';

interface MeasurementTableProps {
    measurements: Measurement[];
    onDelete: (id: string) => void;
    isLightMode: boolean;
}

export const MeasurementTable: React.FC<MeasurementTableProps> = ({
    measurements,
    onDelete,
    isLightMode
}) => {
    const { t } = useTranslation();

    // --- Export Handlers ---

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(t.mtReport as string, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

        // Table Data
        const tableData = measurements.map((m, i) => [
            i + 1,
            `${m.distance.toFixed(2)} Å`,
            `${m.atom1.resName} ${m.atom1.resNo} (${m.atom1.chain})`,
            `${m.atom2.resName} ${m.atom2.resNo} (${m.atom2.chain})`
        ]);

        autoTable(doc, {
            head: [['#', 'Distance', 'Atom 1', 'Atom 2']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244] } // Blue header
        });

        doc.save('measurements_report.pdf');
    };

    const handleExportCSV = () => {
        const headers = [t.mtIndex as string, t.mtDistance as string, t.mtAtom1 as string, t.mtAtom2 as string];
        const rows = measurements.map((m, i) => [
            i + 1,
            m.distance.toFixed(2),
            `"${m.atom1.resName} ${m.atom1.resNo} (${m.atom1.chain})"`, // Quote for safety
            `"${m.atom2.resName} ${m.atom2.resNo} (${m.atom2.chain})"`
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "measurements_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (measurements.length === 0) {
        return (
            <div className="p-4 text-center text-xs opacity-60 italic">
                No measurements yet. Alt+Click two atoms to measure distance.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleExportPDF}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-xs transition-colors"
                >
                    <FileText className="w-3.5 h-3.5" />
                    Export PDF
                </button>
                <button
                    onClick={handleExportCSV}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded text-xs transition-colors"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className={`border rounded-lg overflow-hidden ${isLightMode ? 'border-neutral-200' : 'border-white/10'}`}>
                <table className="w-full text-xs">
                    <thead className={`${isLightMode ? 'bg-neutral-100 text-neutral-500' : 'bg-white/5 text-neutral-400'}`}>
                        <tr>
                            <th className="px-2 py-1.5 text-left font-medium">{t.mtDist}</th>
                            <th className="px-2 py-1.5 text-left font-medium">{t.mtFrom}</th>
                            <th className="px-2 py-1.5 text-left font-medium">{t.mtTo}</th>
                            <th className="w-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {measurements.map((m) => (
                            <tr
                                key={m.id}
                                className={`group transition-colors ${isLightMode
                                    ? 'hover:bg-neutral-50 border-neutral-100'
                                    : 'hover:bg-white/5 border-white/5'
                                    } border-t`}
                            >
                                <td className="px-2 py-1.5 font-bold font-mono">
                                    {m.distance.toFixed(1)}Å
                                </td>
                                <td className="px-2 py-1.5 opacity-80">
                                    {m.atom1.resName}{m.atom1.resNo} {m.atom1.chain}
                                </td>
                                <td className="px-2 py-1.5 opacity-80">
                                    {m.atom2.resName}{m.atom2.resNo} {m.atom2.chain}
                                </td>
                                <td className="px-1 text-center">
                                    <button
                                        onClick={() => onDelete(m.id)}
                                        className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                                        title={t.mtDeleteMeasurement as string}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
