package com.transportes.pagos.culqi;

public record Autenticacion3ds(
        String eci,
        String xid,
        String cavv,
        String protocolVersion,
        String directoryServerTransactionId) {
}
