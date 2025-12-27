"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion } from "framer-motion"

interface User {
  id: string
  username: string
  email: string
  status: "active" | "disabled"
  maxSessions: number
  activeSessions: number
}

const mockUsers: User[] = [
  { id: "1", username: "john.doe", email: "john.doe@email.com", status: "active", maxSessions: 3, activeSessions: 1 },
  {
    id: "2",
    username: "jane.smith",
    email: "jane.smith@email.com",
    status: "active",
    maxSessions: 2,
    activeSessions: 1,
  },
  {
    id: "3",
    username: "bob.wilson",
    email: "bob.wilson@email.com",
    status: "active",
    maxSessions: 5,
    activeSessions: 1,
  },
  {
    id: "4",
    username: "alice.brown",
    email: "alice.brown@email.com",
    status: "active",
    maxSessions: 2,
    activeSessions: 1,
  },
  {
    id: "5",
    username: "charlie.davis",
    email: "charlie.davis@email.com",
    status: "active",
    maxSessions: 3,
    activeSessions: 1,
  },
  {
    id: "6",
    username: "emma.white",
    email: "emma.white@email.com",
    status: "disabled",
    maxSessions: 2,
    activeSessions: 0,
  },
]

export function UsersTable() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Users ({mockUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Username</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Max Sessions</TableHead>
                <TableHead className="text-muted-foreground">Active</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="border-border"
                >
                  <TableCell className="font-medium text-foreground">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.status === "active"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{user.maxSessions}</TableCell>
                  <TableCell className="text-foreground font-mono">{user.activeSessions}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">
                        View Sessions
                      </Button>
                      <Button variant={user.status === "active" ? "ghost" : "default"} size="sm">
                        {user.status === "active" ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="destructive" size="sm">
                        End All
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}
