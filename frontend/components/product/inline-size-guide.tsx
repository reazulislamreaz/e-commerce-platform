import { getSizeGuideForCategory } from '@/features/products/size-guide-data';

export function InlineSizeGuide({ category }: { category: string }) {
  const chart = getSizeGuideForCategory(category);

  return (
    <div className="mt-6 border-t border-[#E5E7EB] pt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#555555]">
        Size guide
      </p>
      <div className="mt-3 rounded-[4px] border border-[#E5E7EB] bg-white">
        <p className="border-b border-[#E5E7EB] px-3 py-2 text-[10px] text-[#555555]">
          {chart.note}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-[11px] sm:min-w-0 sm:text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[10px] uppercase tracking-[.08em] text-[#C9A227]">
                {chart.columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr
                  key={row.size}
                  className="border-b border-[#E5E7EB]/70 last:border-b-0 text-[#555555]"
                >
                  {chart.columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 ${column.key === 'size' ? 'font-semibold text-[#111111]' : ''}`}
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
    </div>
  );
}
