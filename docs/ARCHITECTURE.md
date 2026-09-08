# Architecture

Electron owns settings JSON, server lifecycle, mDNS/UDP discovery and a narrow validated preload bridge. React owns UI and device capture. Native WebRTC carries P2P media with no STUN/TURN; Fastify and ws carry only validated control messages. One authenticated local Teacher and one Student slot exist. A per-launch secret supplied only through local IPC protects Teacher registration. Server permission state is authoritative; Teacher also gates received Student audio to prevent a modified Student client bypassing approval.

Implementation phases: foundation → Electron/server/discovery → media and permission state → classroom/settings/diagnostics UI → automated tests → Windows NSIS build. Physical two-PC offline, hardware, and three-hour tests require school equipment and are documented separately.
