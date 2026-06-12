import db from "./db-client.js";
import { errRouter } from "../errors/error-responder.js";


const documentQueries = {


  async listForUser(userId: string) {
    try {

      const [owned, shared] = await Promise.all([

        db.document.findMany({
          where: { ownerId: userId },
          select: {
            id: true, title: true, ownerId: true,
            createdAt: true, updatedAt: true,
            _count: { select: { shares: true, attachments: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),

        db.documentShare.findMany({
          where: { userId },
          include: {
            document: {
              select: {
                id: true, title: true, ownerId: true,
                createdAt: true, updatedAt: true,
                owner: { select: { id: true, name: true, email: true } },
                _count: { select: { shares: true, attachments: true } },
              },
            },
          },
          orderBy: { document: { updatedAt: "desc" } },
        }),

      ]);

      return {
        owned: owned.map(d => ({ ...d, type: "owned" as const })),
        shared: shared.map(s => ({ ...s.document, sharedAt: s.createdAt, type: "shared" as const })),
      };

    } catch (err) {
      throw errRouter(err);
    }
  },


  async findById({ documentId, userId }: { documentId: string; userId: string }) {
    try {

      const doc = await db.document.findFirst({
        where: {
          id: documentId,
          OR: [
            { ownerId: userId },
            { shares: { some: { userId } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          shares: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          attachments: {
            select: { id: true, filename: true, mimetype: true, size: true, createdAt: true },
          },
        },
      });

      return doc;

    } catch (err) {
      throw errRouter(err);
    }
  },


  async create(ownerId: string, title?: string) {
    try {

      return await db.document.create({
        data: {
          title: title || "Untitled Document",
          ownerId,
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });

    } catch (err) {
      throw errRouter(err);
    }
  },


  async update({ documentId, ownerId, title, content }: {
    documentId: string;
    ownerId: string;
    title?: string;
    content?: string;
  }) {
    try {

      // Only owner OR shared user can update content; only owner can rename
      return await db.document.update({
        where: { id: documentId, ownerId },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
      });

    } catch (err) {
      throw errRouter(err);
    }
  },


  async updateContent({ documentId, userId, content }: {
    documentId: string;
    userId: string;
    content: string;
  }) {
    try {

      // Verify access (owner or shared)
      const access = await db.document.findFirst({
        where: {
          id: documentId,
          OR: [
            { ownerId: userId },
            { shares: { some: { userId } } },
          ],
        },
        select: { id: true, ownerId: true },
      });

      if (!access) return null;

      return await db.document.update({
        where: { id: documentId },
        data: { content },
      });

    } catch (err) {
      throw errRouter(err);
    }
  },


  async delete(documentId: string, ownerId: string) {
    try {

      return await db.document.delete({
        where: { id: documentId, ownerId },
      });

    } catch (err) {
      throw errRouter(err);
    }
  },


  async addShare({ documentId, ownerId, shareWithEmail }: {
    documentId: string;
    ownerId: string;
    shareWithEmail: string;
  }) {
    try {

      // Verify the doc belongs to owner
      const doc = await db.document.findFirst({
        where: { id: documentId, ownerId },
        select: { id: true },
      });

      if (!doc) return null;

      // Find user to share with
      const targetUser = await db.user.findUnique({
        where: { email: shareWithEmail },
        select: { id: true, name: true, email: true },
      });

      if (!targetUser) return { error: "User not found" };

      if (targetUser.id === ownerId) return { error: "Cannot share with yourself" };

      const share = await db.documentShare.create({
        data: { documentId, userId: targetUser.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return { share, user: targetUser };

    } catch (err) {
      throw errRouter(err);
    }
  },


  async removeShare({ documentId, ownerId, shareUserId }: {
    documentId: string;
    ownerId: string;
    shareUserId: string;
  }) {
    try {

      // Verify ownership
      const doc = await db.document.findFirst({
        where: { id: documentId, ownerId },
        select: { id: true },
      });

      if (!doc) return null;

      return await db.documentShare.delete({
        where: { documentId_userId: { documentId, userId: shareUserId } },
      });

    } catch (err) {
      throw errRouter(err);
    }
  },


  async addAttachment({ documentId, userId, filename, mimetype, size, data }: {
    documentId: string;
    userId: string;
    filename: string;
    mimetype: string;
    size: number;
    data: Buffer;
  }) {
    try {

      // Verify access
      const access = await db.document.findFirst({
        where: {
          id: documentId,
          OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
        },
        select: { id: true },
      });

      if (!access) return null;

      return await db.fileAttachment.create({
        data: { documentId, filename, mimetype, size, data: data as unknown as Uint8Array<ArrayBuffer> },
        select: { id: true, filename: true, mimetype: true, size: true, createdAt: true },
      });

    } catch (err) {
      throw errRouter(err);
    }
  },


  async getAttachment(attachmentId: string, userId: string) {
    try {

      const attachment = await db.fileAttachment.findFirst({
        where: {
          id: attachmentId,
          document: {
            OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
          },
        },
      });

      return attachment;

    } catch (err) {
      throw errRouter(err);
    }
  },

};


export default documentQueries;
