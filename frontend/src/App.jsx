import { useRef, useState } from "react";

function App() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);

  const [analysisStatus, setAnalysisStatus] = useState("idle");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [analysisStats, setAnalysisStats] = useState({
    imagesAnalyzed: 0,
    anomaliesDetected: 0,
    highConfidence: "—",
    processingTime: "—",
  });

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setAnalysisStatus("ready");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file || !latitude || !longitude) return;

    setAnalysisStatus("waiting");
    setError("");
    setResults(null);
    setAnalysisStats({
      imagesAnalyzed: 0,
      anomaliesDetected: 0,
      highConfidence: "—",
      processingTime: "—",
    });

    const formData = new FormData();

    formData.append("image", file);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("confidence_threshold", String(confidenceThreshold / 100));

    try {
      const requestStartedAt = performance.now();
      const response = await fetch("http://127.0.0.1:8000/detect", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();
      const detections = Array.isArray(data.detections) ? data.detections : [];
      const highestConfidence = detections.reduce(
        (highest, detection) => Math.max(highest, formatConfidence(detection.confidence)),
        0
      );
      const processingTime = ((performance.now() - requestStartedAt) / 1000).toFixed(2);

      console.log("Backend response:", data);

      setResults(data);
      setAnalysisStats({
        imagesAnalyzed: 1,
        anomaliesDetected: detections.length,
        highConfidence: detections.length ? `${highestConfidence.toFixed(1)}%` : "—",
        processingTime: `${processingTime}s`,
      });
      setAnalysisStatus("complete");

    } catch (error) {
      console.error(error);

      setError(
        "Could not connect to the DeepSight analysis engine."
      );

      setAnalysisStatus("error");
    }
  };  

  const openMap = () => {
    if (!latitude || !longitude) return;

    window.open(
      `https://www.google.com/maps?q=${latitude},${longitude}`,
      "_blank"
    );
  };

  const downloadJSON = () => {
    const report = {
      image: file?.name || null,
      latitude: latitude || null,
      longitude: longitude || null,
      confidence_threshold: confidenceThreshold,
      detections: results?.detections || [],
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "deepsight-report.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const locationReady = latitude !== "" && longitude !== "";
  const canAnalyze = file && locationReady;
  const analysisComplete = analysisStatus === "complete";
  const analysisInProgress = analysisStatus === "waiting";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">

      {/* ================= SIDEBAR ================= */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white lg:block">

        <div className="flex h-full flex-col">

          {/* Logo */}

          <div className="border-b border-slate-200 px-6 py-6">

            <h1 className="text-2xl font-semibold tracking-tight">
              DeepSight
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Underwater sonar intelligence
            </p>

          </div>

          {/* Navigation */}

          <nav className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            <SidebarButton
              icon={<DashboardIcon />}
              label="Dashboard"
              onClick={() => scrollToSection("overview")}
            />

            <SidebarButton
              active
              icon={<ScanIcon />}
              label="Analyze Sonar"
              onClick={() => scrollToSection("analysis")}
            />

            <SidebarButton
              icon={<ResultsIcon />}
              label="Detection Results"
              onClick={() => scrollToSection("results")}
            />

            <SidebarButton
              icon={<ReportIcon />}
              label="Reports"
              onClick={() => scrollToSection("reports")}
            />

            <div className="my-6 border-t border-slate-200" />

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              System
            </p>

            <SidebarButton
              icon={<SettingsIcon />}
              label="Settings"
              onClick={() => setShowSettings(true)}
            />

          </nav>

          {/* System status */}

          <div className="border-t border-slate-200 p-5">

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="flex items-center gap-2">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-sm font-medium text-slate-700">
                  Interface Ready
                </span>

              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Analysis interface is ready. AI engine connection pending.
              </p>

            </div>

          </div>

        </div>

      </aside>


      {/* ================= MAIN ================= */}

      <div className="lg:pl-64">

        {/* Header */}

        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">

          <div className="flex h-20 items-center justify-between px-6 lg:px-10">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Marine intelligence platform
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Sonar Analysis
              </h2>

            </div>

            <div className="flex items-center gap-3">

              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 sm:flex">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-sm text-slate-600">
                  Interface ready
                </span>

              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                title="Settings"
              >
                <SettingsIcon />
              </button>

            </div>

          </div>

        </header>


        {/* ================= CONTENT ================= */}

        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

          {/* Overview */}

          <section id="overview">

            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

              <div>

                <p className="mb-2 text-sm font-medium text-slate-500">
                  Underwater anomaly detection
                </p>

                <h1 className="text-3xl font-semibold tracking-tight">
                  Analyze a sonar image
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Upload a Side-Scan Sonar image and provide its geographic
                  coordinates to detect potential marine anomalies.
                </p>

              </div>

              <span className="text-sm text-slate-400">
                Analysis workspace
              </span>

            </div>


            {/* Stats */}

            <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <StatCard
                label="Images Analyzed"
                value={analysisStats.imagesAnalyzed}
                description="This session"
              />

              <StatCard
                label="Anomalies Detected"
                value={analysisStats.anomaliesDetected}
                description="Current analysis"
              />

              <StatCard
                label="High Confidence"
                value={analysisStats.highConfidence}
                description="Highest detection"
              />

              <StatCard
                label="Processing Time"
                value={analysisStats.processingTime}
                description="Current analysis"
              />

            </div>

          </section>


          {/* ================= ANALYSIS ================= */}

          <section
            id="analysis"
            className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]"
          >

            {/* Sonar image */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <div>

                  <h3 className="font-semibold">
                    Sonar image
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Side-Scan Sonar imagery
                  </p>

                </div>

                {file && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    Image loaded
                  </span>
                )}

              </div>

              <div className="p-5">

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex min-h-[330px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
                    preview
                      ? "border-slate-300 bg-slate-950"
                      : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                  }`}
                >

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />

                  {preview ? (

                    <img
                      src={preview}
                      alt="Uploaded sonar"
                      className="max-h-[400px] w-full object-contain"
                    />

                  ) : (

                    <div className="text-center">

                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                        <UploadIcon />
                      </div>

                      <p className="font-medium">
                        Drop your sonar image here
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        or click to browse your files
                      </p>

                      <p className="mt-3 text-xs text-slate-400">
                        JPG, PNG or other supported image formats
                      </p>

                    </div>

                  )}

                </div>

                {file && (

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">

                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                        setAnalysisStatus("idle");
                      }}
                      className="ml-4 text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Remove
                    </button>

                  </div>

                )}

              </div>

            </div>


            {/* Analysis details */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h3 className="font-semibold">
                  Analysis details
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Configure the location for this sonar capture.
                </p>

              </div>

              <div className="space-y-5 p-6">

                {/* Location */}

                <div>

                  <div className="mb-4 flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <LocationIcon />
                    </div>

                    <div>

                      <p className="text-sm font-medium">
                        Geographic location
                      </p>

                      <p className="text-xs text-slate-400">
                        Coordinates of sonar capture
                      </p>

                    </div>

                  </div>


                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">

                    <div>

                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        Latitude
                      </label>

                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="17.6868"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />

                    </div>

                    <div>

                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        Longitude
                      </label>

                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="83.2185"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />

                    </div>

                  </div>


                  <button
                    onClick={openMap}
                    disabled={!locationReady}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MapIcon />
                    View location on Google Maps
                  </button>

                </div>


                {/* Pipeline */}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Detection pipeline
                  </p>

                  <div className="mt-4 space-y-3">

                    <PipelineStep
                      number="01"
                      title="Image processing"
                      status={file ? "Ready" : "Waiting"}
                      active={!!file}
                    />

                    <PipelineStep
                      number="02"
                      title="Object detection"
                      status={
                        analysisInProgress
                          ? "Processing"
                          : analysisComplete
                            ? "Ready"
                            : "Waiting"
                      }
                      active={analysisInProgress || analysisComplete}
                    />

                    <PipelineStep
                      number="03"
                      title="Confidence filtering"
                      status={analysisComplete ? "Ready" : "Waiting"}
                      active={analysisComplete}
                    />

                    <PipelineStep
                      number="04"
                      title="Location & reporting"
                      status={
                        analysisInProgress
                          ? "Waiting"
                          : locationReady
                            ? "Ready"
                            : "Waiting"
                      }
                      active={!analysisInProgress && locationReady}
                    />

                  </div>

                </div>


                {/* Analyze */}

                <button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="w-full rounded-lg bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {analysisStatus === "waiting"
                    ? "Connecting to analysis engine..."
                    : "Analyze Sonar Image →"}
                </button>

                {error && (
                  <p role="alert" className="text-center text-xs leading-5 text-red-600">
                    {error}
                  </p>
                )}

                <p className="text-center text-xs leading-5 text-slate-400">
                  AI detection will identify potential artificial anomalies
                  and assign confidence scores.
                </p>


              </div>

            </div>

          </section>


          {/* ================= RESULTS ================= */}

          <DetectionResults
            imageUrl={preview}
            results={results}
            latitude={latitude}
            longitude={longitude}
            onViewMap={openMap}
          />


          {/* ================= REPORTS ================= */}

          <section
            id="reports"
            className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >

            <div className="border-b border-slate-200 px-6 py-5">

              <h3 className="font-semibold">
                Reports
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Export analysis information and detection results.
              </p>

            </div>

            <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <ReportIcon />
                </div>

                <div>

                  <p className="text-sm font-medium">
                    Analysis report
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    JSON report containing image, coordinates and detections
                  </p>

                </div>

              </div>

              <button
                onClick={downloadJSON}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Download JSON
              </button>

            </div>

          </section>

        </main>

      </div>


      {/* ================= SETTINGS MODAL ================= */}

      {showSettings && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-5">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>

                <h3 className="font-semibold">
                  Analysis settings
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Configure detection preferences.
                </p>

              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="text-xl text-slate-400 hover:text-slate-900"
              >
                ×
              </button>

            </div>

            <div className="space-y-6 p-6">

              <div>

                <div className="flex items-center justify-between">

                  <label className="text-sm font-medium">
                    Confidence threshold
                  </label>

                  <span className="text-sm font-semibold text-slate-700">
                    {confidenceThreshold}%
                  </span>

                </div>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Detections below this confidence level can be filtered out.
                </p>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidenceThreshold}
                  onChange={(e) =>
                    setConfidenceThreshold(Number(e.target.value))
                  }
                  className="mt-5 w-full"
                />

              </div>

              <div className="rounded-lg bg-slate-50 p-4">

                <p className="text-xs font-medium text-slate-600">
                  Current model
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  YOLO — awaiting backend connection
                </p>

              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
              >
                Save settings
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


/* ================= COMPONENTS ================= */

function SidebarButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
        active
          ? "bg-slate-100 font-medium text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}


function StatCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}


function PipelineStep({ number, title, status, active }) {
  return (
    <div className="flex items-center gap-3">

      <div
        className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-semibold ${
          active
            ? "bg-white text-slate-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {number}
      </div>

      <div className="flex-1">

        <p className="text-xs font-medium text-slate-700">
          {title}
        </p>

      </div>

      <span
        className={`text-[10px] font-medium ${
          active
            ? "text-emerald-600"
            : "text-slate-400"
        }`}
      >
        {status}
      </span>

    </div>
  );
}


function DetectionResults({ imageUrl, results, latitude, longitude, onViewMap }) {
  const detections = Array.isArray(results?.detections) ? results.detections : [];
  const detectionCount = detections.length;

  return (
    <section
      id="results"
      className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h3 className="font-semibold">Detection results</h3>
          <p className="mt-1 text-xs text-slate-500">
            AI-detected marine anomalies from the current analysis
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
          {detectionCount} {detectionCount === 1 ? "detection" : "detections"}
        </span>
      </div>

      <div className="p-6">
        {detectionCount > 0 && imageUrl ? (
          <>
            <DetectionOverlay imageUrl={imageUrl} detections={detections} />

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {detections.map((detection, index) => (
                <DetectionCard
                  key={`${detection.class || "detection"}-${index}`}
                  detection={detection}
                  latitude={latitude}
                  longitude={longitude}
                  onViewMap={onViewMap}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-32 items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <TargetIcon />
              </div>
              <p className="text-sm font-medium text-slate-600">
                No detections yet
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                Detection results will appear here after the AI analysis
                engine processes the sonar image.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


function DetectionOverlay({ imageUrl, detections }) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  return (
    <div className="flex justify-center">
      <div className="relative w-fit max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <img
        src={imageUrl}
        alt="Annotated sonar detections"
        className="block max-h-[400px] max-w-full w-auto object-contain"
        onLoad={(event) => {
          setImageSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          });
        }}
      />

        {imageSize.width > 0 && imageSize.height > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Sonar detection bounding boxes"
        >
          {detections.map((detection, index) => {
            const box = getBoundingBox(detection.bbox);
            if (!box) return null;

            const confidence = formatConfidence(detection.confidence);
            const label = `${detection.class || "Detection"} ${confidence}%`;
            const labelWidth = Math.max(110, label.length * 8 + 18);
            const labelY = Math.max(0, box.y - 28);

            return (
              <g key={`box-${index}`}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  fill="none"
                  stroke="#f87171"
                  strokeWidth={Math.max(3, imageSize.width / 300)}
                />
                <rect
                  x={box.x}
                  y={labelY}
                  width={labelWidth}
                  height="28"
                  fill="#b91c1c"
                  rx="4"
                />
                <text
                  x={box.x + 9}
                  y={labelY + 19}
                  fill="white"
                  fontSize={Math.max(12, imageSize.width / 90)}
                  fontWeight="600"
                >
                  {label}
                </text>
              </g>
            );
          })}
          </svg>
        )}
      </div>
    </div>
  );
}


function DetectionCard({ detection, latitude, longitude, onViewMap }) {
  const confidence = formatConfidence(detection.confidence);
  const confidenceLevel = getConfidenceLevel(confidence);
  const box = getBoundingBox(detection.bbox);

  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <TargetIcon />
          </div>
          <div>
            <p className="text-sm font-medium capitalize text-slate-800">
              {detection.class || "Unknown detection"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {confidence}% {confidenceLevel}
            </p>
          </div>
        </div>

        <button
          onClick={onViewMap}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          View on Map
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <dt className="text-slate-400">Confidence</dt>
          <dd className="mt-1 font-medium text-slate-700">{confidence}%</dd>
        </div>
        <div>
          <dt className="text-slate-400">Location</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {latitude || "—"}, {longitude || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Size</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {box ? `${Math.round(box.width)} × ${Math.round(box.height)} px` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Class</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {detection.class || "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}


function getBoundingBox(bbox) {
  const values = Array.isArray(bbox)
    ? bbox
    : bbox && [bbox.x1, bbox.y1, bbox.x2, bbox.y2];
  if (!values || values.length < 4) return null;

  const [x1, y1, x2, y2] = values.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}


function formatConfidence(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;

  return Math.round((numericValue <= 1 ? numericValue * 100 : numericValue) * 10) / 10;
}


function getConfidenceLevel(confidence) {
  if (confidence >= 80) return "HIGH";
  if (confidence >= 50) return "MEDIUM";
  return "LOW";
}


/* ================= ICONS ================= */

function DashboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}


function ScanIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}


function ResultsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 15l2.5-3 2 2 3.5-5" />
    </svg>
  );
}


function ReportIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}


function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.1 1z" />
    </svg>
  );
}


function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}


function LocationIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}


function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}


function TargetIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}


export default App;