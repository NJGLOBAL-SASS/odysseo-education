import Foundation
import Vision
import AppKit

// Usage : swift boxes.swift <dossier des pages> <noms.txt> <id de page>...
// Pour chaque page : zones à flouter (sous-parties de lignes) selon des motifs de données personnelles.
let dir = CommandLine.arguments[1]
let ids = Array(CommandLine.arguments.dropFirst(3))
// Noms des étudiants (MAJUSCULES, un mot par ligne) : content/admissions/noms.txt, jamais commité.
let names = ((try? String(contentsOfFile: CommandLine.arguments[2], encoding: .utf8)) ?? "")
  .split(whereSeparator: \.isNewline).map { $0.trimmingCharacters(in: .whitespaces).uppercased() }.filter { $0.count >= 3 }
let nameRe = try! NSRegularExpression(pattern: "(?:(?:Mr|Ms|Mrs|Miss)\\.?\\s*)?[A-Z][A-Z.'’\\-]{1,}(?:[\\s,]+[A-Z][A-Z.'’\\-]{1,})*")
let pats = [
  "(?:Application|Applicatio[a-z]*)\\s*(?:Number|No)[\\s.:：]*\\d+", "申请编号[：:]?\\s*\\d+", "学生编号[：:]?\\s*\\d+",
  "Passport\\s*(?:No|number)[\\s.:：）)]*[A-Z]{0,2}\\s?\\d{6,}", "Application\\s*ID[\\s.:：]*\\d+", "CSC\\s*No[.:：]?\\s*[A-Z0-9]+",
  "(?:录取书|通知书)?编号[／/：:\\s]*(?:No\\.?)?\\s*[A-Z0-9]+", "\\bNo\\.?\\s*[A-Z]{2,}\\d{4,}", "^\\d{4}/\\d{1,2}/\\d{1,2}$",
  "(?:\\d{4}\\s){3,}\\d{2,}", "账号[：:]\\s*[\\d\\s]+", "护照号?[为：:\\s]*[A-Z]{1,2}\\d{6,}", "[A-Z]{2}\\d{6,7}",
  "Date\\s*Of\\s*Birth[:：]?\\s*[\\d-]+", "\\b20\\d{8,9}\\b", "\\d{15,}", "登录密码[：:]\\s*\\S+", "Account\\s*N[a-z]*[.:：]?\\s*\\d*"
].map { try! NSRegularExpression(pattern: $0, options: [.caseInsensitive]) }
var out: [String: Any] = [:]
for id in ids {
  let url = URL(fileURLWithPath: "\(dir)/\(id).png")
  guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.recognitionLanguages = ["zh-Hans", "en-US", "fr-FR"]; req.usesLanguageCorrection = false
  let codes = VNDetectBarcodesRequest()
  try VNImageRequestHandler(cgImage: cg).perform([req, codes])
  let W = Double(cg.width), H = Double(cg.height)
  func r(_ b: CGRect) -> [Int] { [Int(b.minX * W), Int((1 - b.maxY) * H), Int(b.width * W), Int(b.height * H)] }
  var boxes: [[String: Any]] = []
  for o in req.results ?? [] {
    guard let c = o.topCandidates(1).first else { continue }
    let s = c.string as NSString
    var ranges: [NSRange] = []
    for p in pats { ranges += p.matches(in: c.string, range: NSRange(location: 0, length: s.length)).map { $0.range } }
    if names.contains(where: { c.string.uppercased().contains($0) }) {
      for m in nameRe.matches(in: c.string, range: NSRange(location: 0, length: s.length)) {
        let t = s.substring(with: m.range).uppercased()
        if names.contains(where: { t.contains($0) }) { ranges.append(m.range) }
      }
    }
    for rg in ranges {
      if let sr = Range(rg, in: c.string), let bb = try? c.boundingBox(for: sr) {
        boxes.append(["b": r(bb.boundingBox), "t": s.substring(with: rg)])
      }
    }
  }
  for b in codes.results ?? [] { boxes.append(["b": r(b.boundingBox), "t": "[code-barres]"]) }
  out[id] = boxes
}
try JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted]).write(to: URL(fileURLWithPath: dir + "/boxes.json"))
for id in ids { print(id, ((out[id] as? [[String: Any]]) ?? []).map { $0["t"] as! String }) }
