import type { Metadata } from 'next';
import { ALL_SIZE_GUIDE_CHARTS } from '@/features/products/size-guide-data';

export const metadata: Metadata = { title: 'Size Guide' };

export default function SizeGuidePage() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Fit Help
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#111111]">Size Guide</h1>
        <p className="mt-3 text-sm text-[#555555]">
          Measurements in inches. If between sizes, size up for oversized styles.
        </p>

        <div className="mt-8 space-y-8">
          {ALL_SIZE_GUIDE_CHARTS.map((chart) => (
            <div key={chart.id}>
              <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
                {chart.title}
              </h2>
              <p className="mt-1 text-[11px] text-[#555555]">{chart.note}</p>
              <div className="mt-3 overflow-x-auto rounded-[4px] border border-[#E5E7EB]">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="bg-white text-[11px] uppercase tracking-wide text-[#C9A227]">
                    <tr>
                      {chart.columns.map((column) => (
                        <th key={column.key} className="px-4 py-3">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((row) => (
                      <tr key={row.size} className="border-t border-[#E5E7EB] text-[#555555]">
                        {chart.columns.map((column) => (
                          <td
                            key={column.key}
                            className={`px-4 py-3 ${column.key === 'size' ? 'font-semibold' : ''}`}
                          >
                            {row[column.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
