import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Size Guide' };

const rows = [
  ['S', '36–38', '28–30'],
  ['M', '38–40', '30–32'],
  ['L', '40–42', '32–34'],
  ['XL', '42–44', '34–36'],
  ['XXL', '44–46', '36–38'],
];

export default function SizeGuidePage() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Fit Help
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Size Guide</h1>
        <p className="mt-3 text-sm text-[#b5b0a8]">
          Measurements in inches. If between sizes, size up for oversized styles.
        </p>
        <div className="mt-6 overflow-x-auto rounded-[4px] border border-[#2d2a27]">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="bg-[#111110] text-[11px] uppercase tracking-wide text-[#e3bb78]">
              <tr>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Chest</th>
                <th className="px-4 py-3">Waist</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([size, chest, waist]) => (
                <tr key={size} className="border-t border-[#2d2a27] text-[#e9e5de]">
                  <td className="px-4 py-3 font-semibold">{size}</td>
                  <td className="px-4 py-3">{chest}</td>
                  <td className="px-4 py-3">{waist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
