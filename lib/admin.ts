// ============================================================================
// ADMIN MODULE - Gestión de PIN, auditoría y operaciones administrativas
// ============================================================================

import { supabase } from './supabase';
import { 
  DBAdminConfig, 
  ValidatePinDTO, 
  CancelTransactionDTO,
  ApiResponse,
  ValidationResult,
  UserRole 
} from '../types';

// ============================================================================
// 1. CONSTANTES DEL SISTEMA
// ============================================================================

const SYSTEM_CONSTANTS = {
  PIN_LENGTH: 4,
  MAX_PIN_ATTEMPTS: 3,
  SESSION_TIMEOUT_MINUTES: 30,
  AUDIT_RETENTION_DAYS: 90,
} as const;

// ============================================================================
// 2. VALIDACIONES Y UTILIDADES
// ============================================================================

/**
 * Valida formato de PIN (4 dígitos numéricos)
 */
export const validatePinFormat = (pin: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pin) {
    errors.push('El PIN es requerido');
  } else if (pin.length !== SYSTEM_CONSTANTS.PIN_LENGTH) {
    errors.push(`El PIN debe tener ${SYSTEM_CONSTANTS.PIN_LENGTH} dígitos`);
  } else if (!/^\d+$/.test(pin)) {
    errors.push('El PIN debe contener solo números');
  } else if (/(\d)\1{2,}/.test(pin)) {
    warnings.push('Evite PINs con números repetidos consecutivos');
  } else if (['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].includes(pin)) {
    warnings.push('PIN demasiado común, considere cambiarlo por seguridad');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Hashea un PIN (en producción usaría bcrypt o similar)
 * Por ahora, solo para demostración - en producción usar crypt()
 */
export const hashPin = (pin: string): string => {
  // En producción: return await bcrypt.hash(pin, 10);
  // Por ahora, solo base64 para demostración
  return btoa(pin);
};

/**
 * Compara PINs (en producción usaría bcrypt.compare)
 */
export const comparePins = (inputPin: string, storedHash: string): boolean => {
  // En producción: return await bcrypt.compare(inputPin, storedHash);
  return hashPin(inputPin) === storedHash;
};

// ============================================================================
// 3. OPERACIONES DE ADMINISTRACIÓN
// ============================================================================

/**
 * Obtiene la configuración administrativa de un negocio
 */
export const getAdminConfig = async (businessId: string): Promise<ApiResponse<DBAdminConfig>> => {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No encontrado
        return {
          success: false,
          error: 'Configuración administrativa no encontrada',
          timestamp: new Date().toISOString()
        };
      }
      throw error;
    }

    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error obteniendo configuración admin:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener configuración administrativa',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Inicializa o actualiza el PIN administrativo
 */
export const initializeAdminPin = async (
  businessId: string, 
  pin: string, 
  userId: string
): Promise<ApiResponse> => {
  try {
    // Validar formato de PIN
    const validation = validatePinFormat(pin);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        warnings: validation.warnings,
        timestamp: new Date().toISOString()
      };
    }

    // Hashear PIN
    const pinHash = hashPin(pin);

    // Insertar o actualizar configuración
    const { error } = await supabase
      .from('admin_config')
      .upsert({
        business_id: businessId,
        admin_pin: pinHash,
        created_by: userId
      }, {
        onConflict: 'business_id'
      });

    if (error) throw error;

    // Registrar en auditoría
    await logAuditEvent({
      business_id: businessId,
      user_id: userId,
      action: 'PIN_CONFIGURED',
      details: { action: 'PIN inicializado/actualizado' },
      ip_address: await getClientIP()
    });

    return {
      success: true,
      message: 'PIN administrativo configurado exitosamente',
      warnings: validation.warnings,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error configurando PIN admin:', error);
    return {
      success: false,
      error: error.message || 'Error al configurar PIN administrativo',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Valida PIN administrativo para una operación
 */
export const validateAdminPin = async (
  businessId: string, 
  pin: string, 
  userId: string
): Promise<ApiResponse<{ isValid: boolean; requiresPin: boolean }>> => {
  try {
    // Obtener configuración
    const configResponse = await getAdminConfig(businessId);
    
    if (!configResponse.success) {
      // Si no hay configuración, no se requiere PIN
      return {
        success: true,
        data: { isValid: true, requiresPin: false },
        message: 'No se requiere validación de PIN',
        timestamp: new Date().toISOString()
      };
    }

    const config = configResponse.data!;
    
    // Validar PIN
    const isValid = comparePins(pin, config.admin_pin);
    
    // Registrar intento en auditoría
    await logAuditEvent({
      business_id: businessId,
      user_id: userId,
      action: isValid ? 'PIN_VALIDATED' : 'PIN_FAILED',
      details: { 
        attempt: 'validación de PIN',
        success: isValid 
      },
      ip_address: await getClientIP()
    });

    return {
      success: true,
      data: { isValid, requiresPin: true },
      message: isValid ? 'PIN válido' : 'PIN incorrecto',
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error validando PIN:', error);
    return {
      success: false,
      error: error.message || 'Error al validar PIN',
      timestamp: new Date().toISOString()
    };
  }
};

// ============================================================================
// 4. AUDITORÍA Y LOGGING
// ============================================================================

interface AuditEvent {
  business_id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Registra un evento de auditoría
 */
export const logAuditEvent = async (event: AuditEvent): Promise<void> => {
  try {
    // En un sistema real, esto iría a una tabla de auditoría
    // Por ahora, solo log a consola y posiblemente a Supabase
    
    const auditLog = {
      ...event,
      timestamp: new Date().toISOString(),
      user_agent: event.user_agent || navigator.userAgent
    };

    console.log('[AUDIT]', auditLog);

    // Opcional: Guardar en Supabase si existe tabla audit_logs
    // const { error } = await supabase
    //   .from('audit_logs')
    //   .insert([auditLog]);
    
    // if (error) console.error('Error guardando auditoría:', error);
  } catch (error) {
    console.error('Error en sistema de auditoría:', error);
  }
};

/**
 * Obtiene eventos de auditoría de un negocio
 */
export const getAuditLogs = async (
  businessId: string, 
  limit: number = 100,
  offset: number = 0
): Promise<ApiResponse<AuditEvent[]>> => {
  try {
    // En un sistema real, consultaría la tabla de auditoría
    // Por ahora, retornamos datos de ejemplo
    return {
      success: true,
      data: [],
      message: 'Auditoría consultada (implementación pendiente)',
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error obteniendo auditoría:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener auditoría',
      timestamp: new Date().toISOString()
    };
  }
};

// ============================================================================
// 5. OPERACIONES SENSIBLES CON VALIDACIÓN DE PIN
// ============================================================================

/**
 * Cancela una transacción con validación de PIN
 */
export const cancelTransactionWithPin = async (
  dto: CancelTransactionDTO
): Promise<ApiResponse> => {
  try {
    const { transaction_id, user_id, admin_pin } = dto;

    // 1. Obtener la transacción para saber el business_id
    const { data: transaction, error: txError } = await supabase
      .from('pedidos')
      .select('business_id')
      .eq('id', transaction_id)
      .single();

    if (txError) throw new Error('Transacción no encontrada');

    // 2. Validar PIN si es requerido
    const pinValidation = await validateAdminPin(
      transaction.business_id, 
      admin_pin || '', 
      user_id
    );

    if (!pinValidation.success) {
      return pinValidation;
    }

    const { isValid, requiresPin } = pinValidation.data!;

    if (requiresPin && !isValid) {
      return {
        success: false,
        error: 'PIN administrativo incorrecto',
        timestamp: new Date().toISOString()
      };
    }

    // 3. Ejecutar función RPC para cancelar transacción
    const { error: rpcError } = await supabase.rpc(
      'cancel_transaction_and_restore_stock',
      {
        p_transaction_id: transaction_id,
        p_user_id: user_id,
        p_admin_pin: requiresPin ? admin_pin : null
      }
    );

    if (rpcError) throw rpcError;

    // 4. Registrar auditoría
    await logAuditEvent({
      business_id: transaction.business_id,
      user_id,
      action: 'TRANSACTION_CANCELLED',
      details: { 
        transaction_id,
        reason: 'Cancelación manual',
        pin_required: requiresPin,
        pin_provided: !!admin_pin
      },
      ip_address: await getClientIP()
    });

    return {
      success: true,
      message: 'Transacción cancelada exitosamente',
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error cancelando transacción:', error);
    return {
      success: false,
      error: error.message || 'Error al cancelar transacción',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Ajusta inventario con validación de PIN
 */
export const adjustInventoryWithPin = async (
  businessId: string,
  productId: string,
  adjustment: number,
  reason: string,
  userId: string,
  adminPin?: string
): Promise<ApiResponse> => {
  try {
    // Validar PIN si es requerido
    const pinValidation = await validateAdminPin(businessId, adminPin || '', userId);
    
    if (!pinValidation.success) {
      return pinValidation;
    }

    const { isValid, requiresPin } = pinValidation.data!;

    if (requiresPin && !isValid) {
      return {
        success: false,
        error: 'PIN administrativo incorrecto',
        timestamp: new Date().toISOString()
      };
    }

    // Actualizar inventario
    const { error } = await supabase
      .from('productos')
      .update({ stock: adjustment })
      .eq('id', productId)
      .eq('business_id', businessId);

    if (error) throw error;

    // Registrar auditoría
    await logAuditEvent({
      business_id: businessId,
      user_id: userId,
      action: 'INVENTORY_ADJUSTED',
      details: {
        product_id: productId,
        adjustment,
        reason,
        pin_required: requiresPin,
        pin_provided: !!adminPin
      },
      ip_address: await getClientIP()
    });

    return {
      success: true,
      message: 'Inventario ajustado exitosamente',
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error ajustando inventario:', error);
    return {
      success: false,
      error: error.message || 'Error al ajustar inventario',
      timestamp: new Date().toISOString()
    };
  }
};

// ============================================================================
// 6. UTILIDADES DE CLIENTE
// ============================================================================

/**
 * Obtiene IP del cliente (simplificado)
 */
const getClientIP = async (): Promise<string> => {
  try {
    // En un sistema real, esto vendría del backend
    // Por ahora, retornamos una IP de ejemplo
    return '127.0.0.1';
  } catch {
    return 'unknown';
  }
};

/**
 * Verifica permisos de usuario
 */
export const checkUserPermissions = (
  userId: string, 
  requiredRole: UserRole,
  businessId: string
): ValidationResult => {
  const errors: string[] = [];
  
  // En un sistema real, verificaría roles en la base de datos
  // Por ahora, validación básica
  
  if (!userId) {
    errors.push('Usuario no autenticado');
  }
  
  if (!businessId) {
    errors.push('Negocio no especificado');
  }
  
  // Aquí iría la lógica real de verificación de roles
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
};

// ============================================================================
// 7. EXPORTACIÓN
// ============================================================================

export default {
  // Validaciones
  validatePinFormat,
  hashPin,
  comparePins,
  
  // Operaciones admin
  getAdminConfig,
  initializeAdminPin,
  validateAdminPin,
  
  // Auditoría
  logAuditEvent,
  getAuditLogs,
  
  // Operaciones sensibles
  cancelTransactionWithPin,
  adjustInventoryWithPin,
  
  // Utilidades
  checkUserPermissions,
  
  // Constantes
  SYSTEM_CONSTANTS
};