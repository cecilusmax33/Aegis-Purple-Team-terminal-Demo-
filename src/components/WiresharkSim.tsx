
import React, { useState, useMemo, useEffect, useRef } from 'react';

interface PacketDetail {
  label: string;
  value?: string;
  children?: PacketDetail[];
}

interface Packet {
  no: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  details: PacketDetail[];
  bytes: string;
}

const MOCK_PACKETS: Packet[] = [
  {
    no: 1,
    time: "0.000000",
    source: "192.168.1.105",
    destination: "192.168.1.1",
    protocol: "TCP",
    length: 74,
    info: "44342 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1",
    details: [
      { label: "Frame 1", value: "74 bytes on wire (592 bits), 74 bytes captured (592 bits)" },
      { label: "Ethernet II", value: "Src: VMware_c0:00:08 (00:50:56:c0:00:08), Dst: Dell_3e:1a:2b (00:0c:29:3e:1a:2b)", children: [
          { label: "Destination", value: "Dell_3e:1a:2b (00:0c:29:3e:1a:2b)" },
          { label: "Source", value: "VMware_c0:00:08 (00:50:56:c0:00:08)" },
          { label: "Type", value: "IPv4 (0x0800)" }
      ]},
      { label: "Internet Protocol Version 4", value: "Src: 192.168.1.105, Dst: 192.168.1.1", children: [
          { label: "Identification", value: "0xd122 (53538)" },
          { label: "Flags", value: "0x4000, Don't fragment" },
          { label: "Time to Live", value: "64" },
          { label: "Protocol", value: "TCP (6)" },
          { label: "Header Checksum", value: "0xb4f9 [validation disabled]" }
      ]},
      { label: "Transmission Control Protocol", value: "Src Port: 44342, Dst Port: 80, Seq: 0, Len: 0", children: [
          { label: "Source Port", value: "44342" },
          { label: "Destination Port", value: "80" },
          { label: "Sequence Number", value: "0 (relative sequence number)" },
          { label: "Acknowledgment Number", value: "0 (relative ack number)" },
          { label: "Flags", value: "0x002 (SYN)", children: [
            { label: "000. .... .... = Reserved", value: "Not set" },
            { label: "...0 .... .... = Nonce", value: "Not set" },
            { label: ".... 0... .... = Congestion Window Reduced (CWR)", value: "Not set" },
            { label: ".... .0.. .... = ECN-Echo", value: "Not set" },
            { label: ".... ..0. .... = Urgent", value: "Not set" },
            { label: ".... ...0 .... = Acknowledgment", value: "Not set" },
            { label: ".... .... 0... = Push", value: "Not set" },
            { label: ".... .... .0.. = Reset", value: "Not set" },
            { label: ".... .... ..1. = Syn", value: "Set" },
            { label: ".... .... ...0 = Fin", value: "Not set" }
          ]}
      ]}
    ],
    bytes: "00 50 56 c0 00 08 00 0c 29 3e 1a 2b 08 00 45 00 00 4a d1 22 40 00 40 06 b4 f9 c0 a8 01 69 c0 a8 01 01 ad 36 00 50 12 d3 42 f1 00 00 00 00 b0 02 fa f0 f9 43 00 00 02 04 05 b4 04 02 08 0a 41 21 de a1 00 00 00 00 01 03 03 07"
  },
  {
    no: 2,
    time: "0.000212",
    source: "192.168.1.1",
    destination: "192.168.1.105",
    protocol: "TCP",
    length: 74,
    info: "80 → 44342 [SYN, ACK] Seq=0 Ack=1 Win=65160 Len=0 MSS=1460",
    details: [
      { label: "Frame 2", value: "74 bytes on wire (592 bits), 74 bytes captured (592 bits)" },
      { label: "Ethernet II", value: "Src: Dell_3e:1a:2b (00:0c:29:3e:1a:2b), Dst: VMware_c0:00:08 (00:50:56:c0:00:08)" },
      { label: "Internet Protocol Version 4", value: "Src: 192.168.1.1, Dst: 192.168.1.105" },
      { label: "Transmission Control Protocol", value: "Src Port: 80, Dst Port: 44342, Seq: 0, Ack: 1, Len: 0", children: [
          { label: "Flags", value: "0x012 (SYN, ACK)" }
      ]}
    ],
    bytes: "00 0c 29 3e 1a 2b 00 50 56 c0 00 08 08 00 45 00 00 4a 00 00 40 00 40 06 86 1c c0 a8 01 01 c0 a8 01 69 00 50 ad 36 34 a1 11 f0 12 d3 42 f2 b0 12 fe 88 4e a1 00 00 02 04 05 b4 04 02 08 0a 00 1f 22 a1 41 21 de a1 01 03 03 07"
  },
  {
    no: 3,
    time: "0.012451",
    source: "192.168.1.105",
    destination: "192.168.1.1",
    protocol: "HTTP",
    length: 452,
    info: "POST /login HTTP/1.1 (application/x-www-form-urlencoded)",
    details: [
      { label: "Frame 3", value: "452 bytes on wire, 452 bytes captured" },
      { label: "Transmission Control Protocol", value: "Src Port: 44342, Dst Port: 80, Seq: 1, Ack: 1, Len: 398" },
      { label: "Hypertext Transfer Protocol", children: [
          { label: "POST /login HTTP/1.1\\r\\n" },
          { label: "Host", value: "192.168.1.1\\r\\n" },
          { label: "Content-Type", value: "application/x-www-form-urlencoded\\r\\n" },
          { label: "Content-Length", value: "15\\r\\n" }
      ]},
      { label: "HTML Form URL Encoded", value: "application/x-www-form-urlencoded", children: [
          { label: "Form item: \"u\"", value: "\"admin\"" },
          { label: "Form item: \"p\"", value: "\"123\"" }
      ]}
    ],
    bytes: "50 4f 53 54 20 2f 6c 6f 67 69 6e 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 31 39 32 2e 31 36 38 2e 31 2e 31 0d 0a 43 6f 6e 74 65 6e 74 2d 54 79 70 65 3a 20 61 70 70 6c 69 63 61 74 69 6f 6e 2f 78 2d 77 77 77 2d 66 6f 72 6d 2d 75 72 6c 65 6e 63 6f 64 65 64 0d 0a 0d 0a 75 3d 61 64 6d 69 6e 26 70 3d 31 32 33"
  },
  {
    no: 4,
    time: "0.015112",
    source: "10.0.5.15",
    destination: "192.168.1.100",
    protocol: "TCP",
    length: 60,
    info: "51234 → 22 [SYN] Seq=0 Win=64240 Len=0",
    details: [
      { label: "Frame 4", value: "60 bytes on wire, 60 bytes captured" },
      { label: "Internet Protocol Version 4", value: "Src: 10.0.5.15, Dst: 192.168.1.100" },
      { label: "Transmission Control Protocol", value: "Src Port: 51234, Dst Port: 22, Seq: 0, Len: 0" }
    ],
    bytes: "45 00 00 3c d1 22 40 00 40 06 b4 f9 0a 00 05 0f c0 a8 01 64 c8 22 00 16 ad 36 00 50 00 00 00 00 a0 02 fa f0 00 00 00 00 02 04 05 b4 04 02 08 0a 41 21 de a1 00 00 00 00 01 03 03 07"
  }
];

const SUGGESTIONS = [
  { label: 'ip.src == ', description: 'Filter by source IP' },
  { label: 'ip.dst == ', description: 'Filter by destination IP' },
  { label: 'ip.addr == ', description: 'Filter by source or destination IP' },
  { label: 'tcp', description: 'Filter for TCP packets' },
  { label: 'udp', description: 'Filter for UDP packets' },
  { label: 'http', description: 'Filter for HTTP packets' },
  { label: 'tls', description: 'Filter for TLS/SSL packets' },
  { label: 'tcp.port == ', description: 'Filter by TCP port' },
  { label: 'not ', description: 'Logical NOT' },
  { label: ' and ', description: 'Logical AND' },
  { label: ' or ', description: 'Logical OR' },
];

interface WiresharkSimProps {
  onClose: () => void;
}

const DetailNode: React.FC<{ node: PacketDetail; depth?: number }> = ({ node, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div 
        className={`flex items-start gap-1 group cursor-pointer hover:bg-blue-50 rounded px-1.5 py-0.5 transition-colors ${depth > 0 ? 'ml-3' : ''}`}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <span className={`text-[8px] mt-1 transition-transform ${hasChildren ? 'text-blue-500' : 'text-gray-300 opacity-0'} ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className="text-[11px] font-mono text-gray-700 group-hover:text-black leading-tight">
          <span className={hasChildren ? "font-bold" : ""}>{node.label}</span>
          {node.value && <span className="ml-1 text-gray-500">: {node.value}</span>}
        </span>
      </div>
      {hasChildren && isOpen && (
        <div className="border-l border-gray-200 ml-2.5">
          {node.children!.map((child, idx) => (
            <DetailNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const WiresharkSim: React.FC<WiresharkSimProps> = ({ onClose }) => {
  const [selectedPacketId, setSelectedPacketId] = useState<number>(1);
  const [filter, setFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  const evaluateExpression = (packet: Packet, expression: string): boolean => {
    expression = expression.trim().toLowerCase();
    if (!expression) return true;

    // Handle logical operators
    if (expression.includes(' or ')) {
      return expression.split(' or ').some(part => evaluateExpression(packet, part));
    }
    if (expression.includes(' and ')) {
      return expression.split(' and ').every(part => evaluateExpression(packet, part));
    }
    if (expression.startsWith('not ')) {
      return !evaluateExpression(packet, expression.substring(4));
    }

    // Specific field matches
    if (expression.startsWith('ip.src == ')) {
      return packet.source === expression.replace('ip.src == ', '').trim();
    }
    if (expression.startsWith('ip.dst == ')) {
      return packet.destination === expression.replace('ip.dst == ', '').trim();
    }
    if (expression.startsWith('ip.addr == ')) {
      const addr = expression.replace('ip.addr == ', '').trim();
      return packet.source === addr || packet.destination === addr;
    }
    if (expression.startsWith('tcp.port == ')) {
      const port = expression.replace('tcp.port == ', '').trim();
      return packet.info.includes(`→ ${port}`) || packet.info.includes(`${port} →`);
    }

    // Keyword fallback
    return (
      packet.protocol.toLowerCase().includes(expression) ||
      packet.source.includes(expression) ||
      packet.destination.includes(expression) ||
      packet.info.toLowerCase().includes(expression)
    );
  };

  const filteredPackets = useMemo(() => {
    try {
      return MOCK_PACKETS.filter(p => evaluateExpression(p, filter));
    } catch (e) {
      // If parsing fails during typing, fall back to basic matching or previous valid state
      return MOCK_PACKETS.filter(p => p.protocol.toLowerCase().includes(filter.toLowerCase()));
    }
  }, [filter]);

  const selectedPacket = useMemo(() => 
    filteredPackets.find(p => p.no === selectedPacketId) || filteredPackets[0] || MOCK_PACKETS[0],
  [selectedPacketId, filteredPackets]);

  const handleCopy = (type: 'bytes' | 'details') => {
    let textToCopy = '';
    if (type === 'bytes') {
      textToCopy = selectedPacket.bytes;
    } else {
      const flattenDetails = (details: PacketDetail[], indent = ''): string => {
        return details.map(d => {
          const line = `${indent}${d.label}${d.value ? `: ${d.value}` : ''}`;
          const children = d.children ? flattenDetails(d.children, indent + '  ') : '';
          return children ? `${line}\n${children}` : line;
        }).join('\n');
      };
      textToCopy = flattenDetails(selectedPacket.details);
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyStatus(`Copied ${type}!`);
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const hexToAscii = (hex: string) => {
    const charCode = parseInt(hex, 16);
    return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : '.';
  };

  const hexRows = useMemo(() => {
    const bytesArray = selectedPacket.bytes.split(' ');
    const rows = [];
    for (let i = 0; i < bytesArray.length; i += 16) {
      const chunk = bytesArray.slice(i, i + 16);
      rows.push({
        offset: i.toString(16).padStart(4, '0'),
        bytes: chunk,
        ascii: chunk.map(hexToAscii).join('')
      });
    }
    return rows;
  }, [selectedPacket]);

  const activeSuggestions = useMemo(() => {
    const lastWord = filter.split(/\s+/).pop()?.toLowerCase() || '';
    return SUGGESTIONS.filter(s => s.label.toLowerCase().includes(lastWord));
  }, [filter]);

  const applySuggestion = (s: string) => {
    const parts = filter.split(/\s+/);
    parts.pop();
    const newVal = parts.join(' ') + (parts.length > 0 ? ' ' : '') + s;
    setFilter(newVal);
    setShowSuggestions(false);
    filterInputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8 font-sans">
      <div className="w-full max-w-6xl h-full flex flex-col bg-[#e9e9e9] rounded-lg shadow-2xl border border-white/20 overflow-hidden text-[#333]">
        {/* Wireshark Header */}
        <div className="bg-[#f0f0f0] border-b border-gray-400 p-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-[#1e4e8e] p-1.5 rounded-sm shadow-inner">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
              </svg>
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">Aegis Wireshark - Capture Module</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-rose-500 hover:text-white rounded-md transition-all active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Menu Bar */}
        <div className="bg-[#f0f0f0] px-4 py-1.5 flex gap-5 text-[10px] text-gray-600 border-b border-gray-300 select-none font-bold">
          {['File', 'Edit', 'View', 'Go', 'Capture', 'Analyze', 'Statistics', 'Help'].map(m => (
            <span key={m} className="hover:text-blue-600 cursor-pointer transition-colors">{m}</span>
          ))}
        </div>

        {/* Filter Bar with Suggestions */}
        <div className="bg-[#f0f0f0] p-2 border-b border-gray-300 relative">
          <div className="flex items-center gap-2 bg-white border border-gray-400 p-1 rounded focus-within:ring-2 focus-within:ring-blue-400 transition-all shadow-inner">
            <div className="flex items-center gap-1.5 ml-2">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              <span className="text-[10px] font-black text-gray-500 uppercase">Apply Display Filter:</span>
            </div>
            <input 
              ref={filterInputRef}
              type="text" 
              placeholder="e.g. ip.src == 192.168.1.105 and tcp..." 
              className="bg-transparent border-none text-[11px] w-full focus:outline-none placeholder:italic placeholder:text-gray-300 font-mono"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {filter && (
              <button onClick={() => setFilter('')} className="p-1 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            )}
            <div className="flex items-center gap-1 pr-1">
              <button 
                onClick={() => setFilter('http')}
                className="bg-blue-100 text-blue-800 text-[9px] px-2 py-0.5 rounded font-black border border-blue-200 hover:bg-blue-200 transition-colors"
              >
                HTTP
              </button>
              <button className="bg-[#1e4e8e] text-white text-[9px] px-3 py-1 rounded font-black uppercase hover:bg-blue-800 active:scale-95 transition-all">Expression</button>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && activeSuggestions.length > 0 && (
            <div className="absolute top-full left-2 right-2 bg-white border border-gray-300 shadow-2xl z-[110] rounded-b-md max-h-48 overflow-y-auto">
              {activeSuggestions.map((s, idx) => (
                <div 
                  key={idx}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center group"
                  onClick={() => applySuggestion(s.label)}
                >
                  <span className="text-[11px] font-mono font-bold text-blue-800">{s.label}</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-tighter group-hover:text-blue-500">{s.description}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <span className="text-[9px] font-bold text-gray-400 uppercase self-center mr-1">Logical Operators:</span>
            {["and", "or", "not"].map(op => (
              <button 
                key={op} 
                onClick={() => setFilter(prev => prev + (prev.endsWith(' ') ? '' : ' ') + op + ' ')}
                className="text-[9px] px-2 py-0.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 font-bold uppercase"
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Packet List Pane */}
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow bg-white overflow-y-auto border-b border-gray-400 scroll-smooth h-[35%] relative">
            <table className="w-full text-left text-[11px] border-collapse table-fixed">
              <thead className="sticky top-0 bg-[#e9e9e9] border-b border-gray-300 z-10 shadow-sm">
                <tr className="font-bold text-gray-600">
                  <th className="px-3 py-1.5 border-r border-gray-300 w-12 text-center">No.</th>
                  <th className="px-3 py-1.5 border-r border-gray-300 w-24">Time</th>
                  <th className="px-3 py-1.5 border-r border-gray-300 w-32">Source</th>
                  <th className="px-3 py-1.5 border-r border-gray-300 w-32">Destination</th>
                  <th className="px-3 py-1.5 border-r border-gray-300 w-20 text-center">Protocol</th>
                  <th className="px-3 py-1.5 border-r border-gray-300 w-16 text-right">Len</th>
                  <th className="px-3 py-1.5">Info</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filteredPackets.map((p) => {
                  let bgColor = 'bg-white';
                  if (p.no === selectedPacketId) bgColor = 'bg-[#1e4e8e] text-white';
                  else if (p.protocol === 'TCP') bgColor = 'bg-[#eef2ff]';
                  else if (p.protocol === 'HTTP') bgColor = 'bg-[#f0fdf4]';

                  return (
                    <tr 
                      key={p.no} 
                      onClick={() => setSelectedPacketId(p.no)}
                      className={`${bgColor} border-b border-gray-100 cursor-default hover:bg-blue-100 hover:text-blue-900 transition-colors group h-6`}
                    >
                      <td className="px-3 py-0.5 border-r border-gray-100/50 text-center">{p.no}</td>
                      <td className="px-3 py-0.5 border-r border-gray-100/50 truncate">{p.time}</td>
                      <td className="px-3 py-0.5 border-r border-gray-100/50 truncate">{p.source}</td>
                      <td className="px-3 py-0.5 border-r border-gray-100/50 truncate">{p.destination}</td>
                      <td className="px-3 py-0.5 border-r border-gray-100/50 text-center font-bold">{p.protocol}</td>
                      <td className="px-3 py-0.5 border-r border-gray-100/50 text-right">{p.length}</td>
                      <td className="px-3 py-0.5 truncate italic opacity-90">{p.info}</td>
                    </tr>
                  );
                })}
                {filteredPackets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 italic font-mono text-xs">
                      [!] No packets matched your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Details & Bytes Viewport */}
          <div className="flex h-[65%] overflow-hidden border-t border-gray-400">
            {/* Dissection Tree Pane */}
            <div className="w-1/2 md:w-5/12 bg-white border-r border-gray-400 p-3 overflow-y-auto flex flex-col custom-scrollbar">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Protocol Dissection
                 </h4>
                 <button 
                    onClick={() => handleCopy('details')}
                    className="text-[9px] bg-gray-100 hover:bg-gray-200 border border-gray-300 px-2 py-0.5 rounded font-bold transition-colors"
                  >
                    Copy Tree
                  </button>
               </div>
               
               {/* Packet Summary Panel */}
               <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 space-y-2">
                 <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                   <span className="text-[10px] font-black text-gray-500">PACKET SUMMARY [#{selectedPacket.no}]</span>
                   <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 rounded">IPv4 / {selectedPacket.protocol}</span>
                 </div>
                 <div className="grid grid-cols-2 gap-y-1.5 text-[10px] font-mono">
                   <div><span className="text-gray-400">Arrival Time:</span> {new Date().toLocaleDateString()} {selectedPacket.time}</div>
                   <div><span className="text-gray-400">Capture Len:</span> {selectedPacket.length} bytes</div>
                   <div><span className="text-gray-400">Interface:</span> eth0 (Inbound)</div>
                   <div><span className="text-gray-400">Epoch Time:</span> {Date.now()}.{selectedPacket.no}</div>
                 </div>
                 <div className="text-[10px] font-mono p-1.5 bg-white border border-gray-200 rounded text-gray-700 italic">
                   {selectedPacket.info}
                 </div>
               </div>

               <div className="flex-grow space-y-0.5">
                 {selectedPacket.details.map((node, i) => (
                   <DetailNode key={i} node={node} />
                 ))}
               </div>
            </div>

            {/* Optimized Hex Dump Pane */}
            <div className="flex-grow bg-[#fcfcfc] p-3 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Data Payload / Hex Dump
                </h4>
                <div className="flex gap-2 items-center">
                   {copyStatus && <span className="text-[9px] text-emerald-600 font-bold animate-pulse">{copyStatus}</span>}
                   <button 
                      onClick={() => handleCopy('bytes')}
                      className="text-[9px] bg-gray-100 hover:bg-gray-200 border border-gray-300 px-2 py-0.5 rounded font-bold transition-colors"
                    >
                      Copy Bytes
                    </button>
                </div>
              </div>
              
              <div className="font-mono text-[11px] bg-white border border-gray-200 rounded shadow-inner overflow-x-auto min-w-fit">
                {/* Hex Header */}
                <div className="flex gap-5 border-b border-gray-100 py-1.5 px-3 bg-gray-50/50 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                  <span className="w-12 shrink-0">Offset</span>
                  <div className="flex gap-1.5 shrink-0">
                    {Array.from({length: 16}).map((_, i) => (
                      <span key={i} className="w-[2.2ch] text-center">{i.toString(16).toUpperCase()}</span>
                    ))}
                  </div>
                  <span className="border-l border-gray-100 pl-4">ASCII Decode</span>
                </div>
                
                {/* Hex Content */}
                <div className="p-3 space-y-0.5">
                  {hexRows.map((row, idx) => (
                    <div key={idx} className="flex gap-5 group hover:bg-blue-50 transition-colors py-0.5 px-1 rounded whitespace-nowrap">
                      <span className="text-gray-400 font-bold w-12 shrink-0 select-none">{row.offset}</span>
                      <div className="flex gap-1.5 shrink-0 text-gray-800">
                        {row.bytes.map((byte, bi) => (
                          <span key={bi} className={`w-[2.2ch] text-center ${bi === 7 ? 'mr-1' : ''}`}>
                            {byte}
                          </span>
                        ))}
                        {/* Padding for incomplete rows */}
                        {row.bytes.length < 16 && Array.from({length: 16 - row.bytes.length}).map((_, i) => (
                          <span key={i} className="w-[2.2ch] h-4"></span>
                        ))}
                      </div>
                      <span className="text-blue-700 font-bold border-l-2 border-gray-100 pl-4 shrink-0 min-w-[16ch] tracking-widest">
                        {row.ascii}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f0f0f0] border-t border-gray-400 p-1.5 px-4 flex items-center justify-between text-[10px] font-bold text-gray-500 select-none">
           <div className="flex gap-6 items-center">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Packets: {MOCK_PACKETS.length}</span>
              <span className="text-blue-600 font-black flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Displayed: {filteredPackets.length}</span>
              <span className="text-gray-400">|</span>
              <span>Selected: No. {selectedPacket.no}</span>
           </div>
           <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Tactical Sink Synchronized</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WiresharkSim;
