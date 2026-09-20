# Custom exceptions

class BlockByBlockException(Exception):
    """Base exception para Block by Block."""
    pass

class AuthenticationException(BlockByBlockException):
    """Error de autenticación."""
    pass

class AuthorizationException(BlockByBlockException):
    """Error de autorización."""
    pass

class CauseNotFoundException(BlockByBlockException):
    """Causa no encontrada."""
    pass

class InvalidCauseStatusException(BlockByBlockException):
    """Estado inválido de causa."""
    pass

class DonationException(BlockByBlockException):
    """Error en donación."""
    pass

class AgentException(BlockByBlockException):
    """Error del agente de IA."""
    pass
