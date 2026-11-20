import type { Agencia } from '@/types/agency'
import type { RespuestaLogin } from '@/types/auth'
import type {
  EventoAsiento,
  FiltrosConsulta,
  MapaAsientosConsulta,
  RutaCiudad,
  SesionReserva,
  ViajeConsulta,
} from '@/types/consultaViaje'
import type { ClienteDetalle, ConsultaClientes, IndicadoresClientes, PaginaClientes } from '@/types/cliente'
import type { ConsultaDashboard, DatosDashboard, OpcionesDashboard } from '@/types/dashboard'
import type { ConsultaPasajes, OpcionesFiltroPasajes, PaginaPasajes } from '@/types/listadoPasajes'
import type { MetodoPago } from '@/types/pago'
import type { Servicio } from '@/types/servicio'
import type { Ruta } from '@/types/viaje'

export interface CatalogService {
  listarAgencias(): Promise<Agencia[]>
  listarServicios(): Promise<Servicio[]>
  listarMetodosPago(): Promise<MetodoPago[]>
  listarCiudades(): Promise<string[]>
  listarRutas(): Promise<Ruta[]>
}

export interface ConsultaViajesService {
  listarRutasCiudad(): Promise<RutaCiudad[]>
  buscarViajes(filtros: FiltrosConsulta): Promise<ViajeConsulta[]>
  obtenerMapaAsientos(idViaje: number, tokenSesion?: string): Promise<MapaAsientosConsulta>
  crearSesion(idViaje: number, minutos: number): Promise<SesionReserva>
  bloquearAsiento(idViaje: number, idAsiento: number, tokenSesion: string): Promise<void>
  liberarAsiento(idViaje: number, idAsiento: number, tokenSesion: string): Promise<void>
  liberarSesion(idViaje: number, tokenSesion: string): Promise<void>
  suscribirAsientos(
    idViaje: number,
    manejadores: { alAbrir?: () => void; alError?: () => void; alAsiento?: (evento: EventoAsiento) => void },
  ): () => void
}

export interface DashboardService {
  obtenerDashboard(consulta: ConsultaDashboard): Promise<DatosDashboard>
  /** Agencias, servicios y destinos para los filtros, y la fecha "hoy" del sistema. */
  obtenerOpciones(): Promise<OpcionesDashboard>
}

export interface ClientesService {
  listar(consulta: ConsultaClientes): Promise<PaginaClientes>
  indicadores(): Promise<IndicadoresClientes>
  detalle(idPasajero: number): Promise<ClienteDetalle>
}

export interface PasajesService {
  listar(consulta: ConsultaPasajes): Promise<PaginaPasajes>
  opciones(): Promise<OpcionesFiltroPasajes>
}

export interface AuthService {
  iniciarSesion(correo: string, contrasena: string): Promise<RespuestaLogin>
  cerrarSesion(): Promise<void>
}
