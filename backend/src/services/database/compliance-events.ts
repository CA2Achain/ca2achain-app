import { getClient } from './connection.js';
import type { 
  ComplianceEvent 
} from '@ca2achain/shared';

interface ComplianceEventData {
  buyer_id: string;
  dealer_id: string;
  buyer_reference_id: string;
  dealer_reference_id: string;
  verification_data: Record<string, any>;
  age_verified: boolean;
  address_verified: boolean;
  blockchain_info?: Record<string, any>;
}

/**
 * Create compliance event (immutable verification record)
 * Created with complete data including blockchain info if available
 */
export const createComplianceEvent = async (
  data: ComplianceEventData
): Promise<ComplianceEvent> => {
  const { data: event, error } = await getClient()
    .from('compliance_events')
    .insert({
      buyer_id: data.buyer_id,
      dealer_id: data.dealer_id,
      buyer_reference_id: data.buyer_reference_id,
      dealer_reference_id: data.dealer_reference_id,
      verification_data: data.verification_data,
      age_verified: data.age_verified,
      address_verified: data.address_verified,
      blockchain_info: data.blockchain_info
    })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to create compliance event: ${error.message}`);
  return event;
};

/**
 * Get compliance event by ID
 */
export const getComplianceEventById = async (id: string): Promise<ComplianceEvent | null> => {
  const { data: event, error } = await getClient()
    .from('compliance_events')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get compliance event: ${error.message}`);
  }
  return event || null;
};

/**
 * Get verification history for buyer (for buyer dashboard)
 */
export const getVerificationHistory = async (buyerId: string): Promise<ComplianceEvent[]> => {
  const { data: events, error } = await getClient()
    .from('compliance_events')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('verified_at', { ascending: false });
    
  if (error) throw new Error(`Failed to get verification history: ${error.message}`);
  return events || [];
};

/**
 * Get dealer verification history (for dealer dashboard)
 */
export const getDealerVerificationHistory = async (dealerId: string): Promise<ComplianceEvent[]> => {
  const { data: events, error } = await getClient()
    .from('compliance_events')
    .select('*')
    .eq('dealer_id', dealerId)
    .order('verified_at', { ascending: false });
    
  if (error) throw new Error(`Failed to get dealer verification history: ${error.message}`);
  return events || [];
};

/**
 * Anonymize compliance events for buyer (CCPA compliance)
 * Sets buyer_id to NULL while preserving the compliance record
 */
export const anonymizeComplianceEvents = async (buyerId: string): Promise<number> => {
  const { data, error } = await getClient()
    .from('compliance_events')
    .update({ buyer_id: null })
    .eq('buyer_id', buyerId)
    .select('id');
    
  if (error) throw new Error(`Failed to anonymize compliance events: ${error.message}`);
  return data?.length || 0;
};