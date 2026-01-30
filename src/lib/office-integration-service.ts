import { supabase } from './supabase';

export interface OfficeNotification {
  id: string;
  type: 'collection_created' | 'collection_updated' | 'collection_approved' | 'collection_rejected';
  title: string;
  message: string;
  data: any;
  created_at: string;
  read: boolean;
}

export interface CollectionForApproval {
  id: string;
  collector_id: string;
  collector_name: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  weight_kg: number;
  status: string;
  collection_date: string;
  notes?: string;
  created_at: string;
  materials: Array<{
    material_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export class OfficeIntegrationService {
  // Send collection to office app for approval
  static async sendCollectionForApproval(collectionId: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('📤 Sending collection for approval:', collectionId);

      // Get unified collection details with materials (no external joins required)
      const { data: collection, error: collectionError } = await supabase
        .from('unified_collections')
        .select(`
          id,
          collector_id,
          collector_name,
          customer_id,
          customer_name,
          customer_email,
          total_weight_kg,
          status,
          actual_date,
          created_at,
          collector_notes,
          collection_materials(
            material_id,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', collectionId)
        .single();

      if (collectionError) {
        console.error('❌ Error fetching collection for approval:', collectionError);
        return { success: false, error: collectionError };
      }

      // Use denormalized fields from unified_collections; no extra fetch needed

      // Create notification for office app
      const notificationData = {
        type: 'collection_created',
        title: 'New Collection Requires Approval',
        message: `Collection from ${collection.customer_name || collection.customer_email || 'Customer'} by ${collection.collector_name || 'Collector'}`,
        data: {
          collection_id: collectionId,
          collector_id: collection.collector_id,
          collector_name: collection.collector_name || 'Collector',
          customer_id: collection.customer_id,
          customer_name: collection.customer_name || 'Customer',
          customer_email: collection.customer_email,
          weight_kg: collection.total_weight_kg || 0,
          status: collection.status,
          collection_date: collection.actual_date || collection.created_at,
          notes: collection.collector_notes,
          created_at: collection.created_at,
          materials: collection.collection_materials?.map((item: any) => ({
            material_name: item.material_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          })) || []
        },
        read: false,
        created_at: new Date().toISOString()
      };

      // Insert notification (assuming there's a notifications table)
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (notificationError) {
        console.warn('⚠️ Could not create notification (table may not exist):', notificationError);
        // Don't fail the operation if notifications table doesn't exist
      }

      // Update collection status to 'pending_approval'
      const { error: updateError } = await supabase
        .from('unified_collections')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (updateError) {
        console.error('❌ Error updating collection status:', updateError);
        return { success: false, error: updateError };
      }

      console.log('✅ Collection sent for approval successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('❌ Error in sendCollectionForApproval:', error);
      return { success: false, error };
    }
  }

  // Get collections pending approval
  static async getPendingApprovals(): Promise<{ data: CollectionForApproval[] | null; error: any }> {
    try {
      console.log('📋 Fetching collections pending approval');

      const { data, error } = await supabase
        .from('unified_collections')
        .select(`
          id,
          collector_id,
          collector_name,
          customer_id,
          customer_name,
          customer_email,
          total_weight_kg,
          status,
          actual_date,
          created_at,
          collection_materials(
            material_id,
            quantity,
            unit_price,
            total_price
          )
        `)
        .in('status', ['pending'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching pending approvals:', error);
        return { data: null, error };
      }

      const collections: CollectionForApproval[] = (data || []).map(collection => {
        // Get collector name
        const collectorName = collection.collector_name || 'Collector';
        
        return {
          id: collection.id,
          collector_id: collection.collector_id,
          collector_name: collectorName,
          customer_id: collection.customer_id,
          customer_name: collection.customer_name || 'Unknown Customer',
          customer_email: collection.customer_email || '',
          weight_kg: collection.total_weight_kg || 0,
          status: collection.status,
          collection_date: collection.actual_date || collection.created_at,
          notes: collection.collector_notes,
          created_at: collection.created_at,
          materials: collection.collection_materials?.map((item: any) => ({
            material_name: item.material_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          })) || []
        };
      });

      console.log('✅ Pending approvals fetched:', collections.length);
      return { data: collections, error: null };

    } catch (error) {
      console.error('❌ Error in getPendingApprovals:', error);
      return { data: null, error };
    }
  }

  // Approve a collection
  static async approveCollection(collectionId: string, approvedBy: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('✅ Approving collection:', collectionId);

      // Update collection status
      const { error: updateError } = await supabase
        .from('unified_collections')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (updateError) {
        console.error('❌ Error approving collection:', updateError);
        return { success: false, error: updateError };
      }

      // Create approval notification
      const { data: collection } = await supabase
        .from('unified_collections')
        .select('collector_id, customer_id')
        .eq('id', collectionId)
        .single();

      if (collection) {
        const notificationData = {
          type: 'collection_approved',
          title: 'Collection Approved',
          message: 'Your collection has been approved and processed',
          data: {
            collection_id: collectionId,
            approved_by: approvedBy,
            approved_at: new Date().toISOString()
          },
          read: false,
          created_at: new Date().toISOString()
        };

        // Insert notification for collector
        await supabase
          .from('notifications')
          .insert({
            ...notificationData,
            user_id: collection.collector_id
          });
      }

      console.log('✅ Collection approved successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('❌ Error in approveCollection:', error);
      return { success: false, error };
    }
  }

  // Reject a collection
  static async rejectCollection(collectionId: string, rejectedBy: string, reason?: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('❌ Rejecting collection:', collectionId);

      // Update collection status
      const { error: updateError } = await supabase
        .from('unified_collections')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (updateError) {
        console.error('❌ Error rejecting collection:', updateError);
        return { success: false, error: updateError };
      }

      // Create rejection notification
      const { data: collection } = await supabase
        .from('unified_collections')
        .select('collector_id, customer_id')
        .eq('id', collectionId)
        .single();

      if (collection) {
        const notificationData = {
          type: 'collection_rejected',
          title: 'Collection Rejected',
          message: reason ? `Your collection was rejected: ${reason}` : 'Your collection was rejected',
          data: {
            collection_id: collectionId,
            rejected_by: rejectedBy,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason
          },
          read: false,
          created_at: new Date().toISOString()
        };

        // Insert notification for collector
        await supabase
          .from('notifications')
          .insert({
            ...notificationData,
            user_id: collection.collector_id
          });
      }

      console.log('✅ Collection rejected successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('❌ Error in rejectCollection:', error);
      return { success: false, error };
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: string): Promise<{ data: OfficeNotification[] | null; error: any }> {
    try {
      console.log('🔔 Fetching notifications for user:', userId);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        return { data: null, error };
      }

      const notifications: OfficeNotification[] = (data || []).map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        created_at: notification.created_at,
        read: notification.read || false
      }));

      console.log('✅ Notifications fetched:', notifications.length);
      return { data: notifications, error: null };

    } catch (error) {
      console.error('❌ Error in getUserNotifications:', error);
      return { data: null, error };
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('👁️ Marking notification as read:', notificationId);

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return { success: false, error };
      }

      console.log('✅ Notification marked as read');
      return { success: true, error: null };

    } catch (error) {
      console.error('❌ Error in markNotificationAsRead:', error);
      return { success: false, error };
    }
  }
}
