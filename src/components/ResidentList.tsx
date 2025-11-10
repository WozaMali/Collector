"use client";

import { useState, useEffect } from "react";
import { ResidentService, type Resident } from "@/lib/resident-service";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface ResidentListProps {
  onResidentSelect?: (resident: Resident) => void;
  showSearch?: boolean;
  showTownshipFilter?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export default function ResidentList({
  onResidentSelect,
  showSearch = true,
  showTownshipFilter = true,
  title = "Residents",
  description = "Select a resident to view details or start a collection",
  className = ""
}: ResidentListProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filteredResidents, setFilteredResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTownship, setSelectedTownship] = useState<string>("");
  const [townships, setTownships] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    loadResidents();
    loadTownships();
  }, []);

  useEffect(() => {
    filterResidents();
  }, [residents, searchQuery, selectedTownship]);

  const loadResidents = async () => {
    setLoading(true);
    try {
      const residentsData = await ResidentService.getAllResidents();
      setResidents(residentsData);
    } catch (error) {
      console.error('Error loading residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTownships = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTownships(data || []);
    } catch (error) {
      console.error('Error loading townships:', error);
    }
  };

  const filterResidents = () => {
    let filtered = residents;

    if (selectedTownship) {
      filtered = filtered.filter(resident => resident.area_id === selectedTownship);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(resident => 
        resident.name.toLowerCase().includes(query) ||
        resident.phone?.toLowerCase().includes(query) ||
        resident.email?.toLowerCase().includes(query) ||
        resident.township.toLowerCase().includes(query)
      );
    }

    setFilteredResidents(filtered);
  };

  const handleTownshipChange = (townshipId: string) => {
    setSelectedTownship(townshipId);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const residentsWithAddresses = filteredResidents.filter(r => r.hasAddress);
  const residentsWithoutAddresses = filteredResidents.filter(r => !r.hasAddress);

  if (loading) {
    return (
      <Card className={`bg-gray-800 border-gray-700 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-gray-300">Loading residents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
        <CardDescription className="text-gray-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showSearch && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Search Residents</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white pl-10"
                />
              </div>
            </div>
          )}

          {showTownshipFilter && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Filter by Township</label>
              <Select value={selectedTownship} onValueChange={handleTownshipChange}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All townships" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All townships</SelectItem>
                  {townships.map((township) => (
                    <SelectItem key={township.id} value={township.id}>
                      {township.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            <span>{residentsWithAddresses.length} with addresses</span>
          </div>
          <div className="flex items-center text-red-400">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{residentsWithoutAddresses.length} without addresses</span>
          </div>
        </div>

        {/* Residents List */}
        {filteredResidents.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Residents with addresses */}
            {residentsWithAddresses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-medium text-sm">With Addresses ({residentsWithAddresses.length})</h4>
                {residentsWithAddresses.map((resident) => (
                  <div
                    key={resident.id}
                    className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => onResidentSelect?.(resident)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="text-white font-medium">{resident.name}</h5>
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                          {resident.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {resident.phone}
                            </span>
                          )}
                          {resident.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {resident.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {resident.township}
                        </div>
                        <p className="text-green-400 text-sm mt-1">{resident.address}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Has Address
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Residents without addresses */}
            {residentsWithoutAddresses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-medium text-sm">Without Addresses ({residentsWithoutAddresses.length})</h4>
                {residentsWithoutAddresses.map((resident) => (
                  <div
                    key={resident.id}
                    className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => onResidentSelect?.(resident)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="text-white font-medium">{resident.name}</h5>
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                          {resident.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {resident.phone}
                            </span>
                          )}
                          {resident.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {resident.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {resident.township}
                        </div>
                        <p className="text-red-400 text-sm mt-1">⚠️ No address on file</p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        No Address
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No residents found</p>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'Try a different search term' : 'No residents available'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
