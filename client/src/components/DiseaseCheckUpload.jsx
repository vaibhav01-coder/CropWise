import { useEffect, useState } from "react";

const diseaseBase = import.meta.env.VITE_DISEASE_API_BASE || "/disease-api";

export default function DiseaseCheckUpload({ profile }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError("");
  }

  async function handleSubmit() {
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${diseaseBase}/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Prediction failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err?.message || "Prediction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/[0.05] rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="relative z-10">
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
            Leaf Disease Detection
          </p>
          <h2 className="text-2xl font-bold mt-2">Analyze a crop photo for visible disease signs</h2>
          <p className="text-emerald-100/80 text-sm mt-2 max-w-2xl">
            Upload a clear leaf image to run the trained disease model. Best results come from close,
            well-lit photos with the affected area filling most of the frame.
          </p>
          {profile?.primary_crop && (
            <p className="text-xs text-emerald-100/70 mt-3">
              Current profile crop: {String(profile.primary_crop).replace(/_/g, " ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-6">
        <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-stone-800">Upload Photo</h3>
             <p className="text-sm text-stone-500 mt-1">
                Accepted formats: JPG, PNG, or WEBP.
              </p>
              <p className="text-xs text-amber-600 mt-1.5">
                For best results, upload a clear, close-up photo of a single plant leaf. Accuracy may be lower for unrelated images.
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              Model inference
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Leaf image
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="block w-full text-sm text-stone-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
              />
            </label>

            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 min-h-[280px] flex items-center justify-center overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt="Leaf preview"
                  className="w-full h-[320px] object-cover"
                />
              ) : (
                <div className="text-center px-6">
                  <p className="text-sm font-semibold text-stone-700">No image selected yet</p>
                  <p className="text-xs text-stone-500 mt-2">
                    Choose a photo with the leaf clearly visible and in focus.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Analyzing image..." : "Analyze Leaf"}
            </button>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6">
            <h3 className="font-bold text-stone-800">Result</h3>
            {!result ? (
              <p className="text-sm text-stone-500 mt-3">
                Upload an image to see the top disease prediction, confidence, and basic action advice.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Top prediction
                  </p>
                  <p className="text-xl font-bold text-stone-800 mt-2">
                    {result.top_prediction.crop}
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    {result.top_prediction.condition}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 mt-3">
                    Confidence: {result.top_prediction.confidence}%
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Top matches
                  </p>
                  <div className="space-y-2">
                    {result.all_predictions.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-semibold text-stone-800">{item.crop}</p>
                          <p className="text-sm text-stone-500">{item.condition}</p>
                        </div>
                        <span className="text-sm font-bold text-stone-700">
                          {item.confidence}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Advice
                  </p>
                  <p className="text-sm text-stone-700 mt-2">{result.advice}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6">
            <h3 className="font-bold text-stone-800">Photo Tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li>Capture the leaf in natural light when possible.</li>
              <li>Keep the affected area centered and sharp.</li>
              <li>Avoid blurry images, heavy shadows, or too much background.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
