import Foundation
import PDFKit
import Vision
import AppKit

let args = CommandLine.arguments
let inDir = args[1], outDir = args[2]
let files = try FileManager.default.contentsOfDirectory(atPath: inDir).filter { $0.lowercased().hasSuffix(".pdf") }.sorted()
var index: [[String: Any]] = []
for (n, f) in files.enumerated() {
  guard let doc = PDFDocument(url: URL(fileURLWithPath: inDir + "/" + f)) else { continue }
  for p in 0..<min(doc.pageCount, 2) {
    guard let page = doc.page(at: p) else { continue }
    let box = page.bounds(for: .mediaBox)
    let scale = 1800.0 / max(box.width, box.height) * (box.width > box.height ? 1 : 1)
    let size = NSSize(width: box.width * scale, height: box.height * scale)
    let img = page.thumbnail(of: size, for: .mediaBox)
    guard let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let cg = rep.cgImage else { continue }
    let id = String(format: "a%02d-p%d", n + 1, p + 1)
    let png = rep.representation(using: .png, properties: [:])!
    try png.write(to: URL(fileURLWithPath: "\(outDir)/\(id).png"))
    let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.recognitionLanguages = ["zh-Hans", "en-US", "fr-FR"]; req.usesLanguageCorrection = false
    let faces = VNDetectFaceRectanglesRequest(); let codes = VNDetectBarcodesRequest()
    try VNImageRequestHandler(cgImage: cg).perform([req, faces, codes])
    let W = Double(cg.width), H = Double(cg.height)
    func r(_ b: CGRect) -> [Int] { [Int(b.minX * W), Int((1 - b.maxY) * H), Int(b.width * W), Int(b.height * H)] }
    let lines = (req.results ?? []).map { o -> [String: Any] in ["t": o.topCandidates(1).first?.string ?? "", "b": r(o.boundingBox)] }
    index.append(["id": id, "file": f, "w": cg.width, "h": cg.height, "lines": lines,
                  "faces": (faces.results ?? []).map { r($0.boundingBox) }, "codes": (codes.results ?? []).map { r($0.boundingBox) }])
  }
}
let data = try JSONSerialization.data(withJSONObject: index, options: [.prettyPrinted])
try data.write(to: URL(fileURLWithPath: outDir + "/ocr.json"))
print("pages", index.count)
