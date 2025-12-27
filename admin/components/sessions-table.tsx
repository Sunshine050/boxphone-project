"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Eye, Power, Grid3x3, List } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Session {
  id: string
  userName: string
  deviceName: string
  startTime: string
  remainingTime: string
}

const mockSessions: Session[] = [
  {
    id: "1",
    userName: "john.doe@email.com",
    deviceName: "Android-001",
    startTime: "2h 14m ago",
    remainingTime: "45m 32s",
  },
  {
    id: "2",
    userName: "jane.smith@email.com",
    deviceName: "Android-003",
    startTime: "45m ago",
    remainingTime: "1h 15m",
  },
  {
    id: "3",
    userName: "bob.wilson@email.com",
    deviceName: "Android-006",
    startTime: "3h 36m ago",
    remainingTime: "23m 10s",
  },
  {
    id: "4",
    userName: "alice.brown@email.com",
    deviceName: "Android-008",
    startTime: "55m ago",
    remainingTime: "2h 05m",
  },
  {
    id: "5",
    userName: "charlie.davis@email.com",
    deviceName: "Android-011",
    startTime: "2h 21m ago",
    remainingTime: "38m 45s",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export function SessionsTable() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Active Sessions</p>
                <p className="text-4xl font-bold">142</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded bg-primary/80" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Session Duration</p>
                <p className="text-4xl font-bold">48m 12s</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded bg-blue-500/80" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical Time Remaining</p>
                <p className="text-4xl font-bold text-red-500">5</p>
                <p className="text-xs text-red-500 mt-1">Alert</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-red-500/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by User Name, Device ID or IP..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Region: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Region: All</SelectItem>
            <SelectItem value="us">US Regions</SelectItem>
            <SelectItem value="eu">EU Regions</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-models">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Model: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-models">Model: All</SelectItem>
            <SelectItem value="pixel">Pixel</SelectItem>
            <SelectItem value="galaxy">Galaxy</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="in-use">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status: In Use" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in-use">Status: In Use</SelectItem>
            <SelectItem value="all">All Status</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="icon" className="bg-primary/10">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Grid3x3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground uppercase text-xs">User</TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs">Device Info</TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs">Location</TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs">Start Time</TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs">Remaining</TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs">Status</TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSessions.map((session, index) => (
                <motion.tr
                  key={session.id}
                  custom={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="border-border hover:bg-accent/5"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {session.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {session.userName.split("@")[0].replace(".", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{session.userName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <div className="w-4 h-4 rounded-sm bg-foreground/20" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Pixel 6 Pro</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: PX-8832-US</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-sm">US-East-1</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-mono">14:30:00</p>
                      <p className="text-xs text-muted-foreground">EST</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: "60%" }} />
                      </div>
                      <p className="font-mono text-sm text-green-500">00:45:12</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                      In Use
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Power className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">1-5</span> of{" "}
              <span className="font-medium text-foreground">142</span> sessions
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
